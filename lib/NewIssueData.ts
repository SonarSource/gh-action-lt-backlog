import { EngineeringExperienceSquad } from "../Data/TeamConfiguration";
import { Config } from "./Configuration";
import { JIRA_ISSUE_PATTERN } from "./Constants";
import { JiraClient } from "./JiraClient";
import { PullRequest } from "./OctokitTypes";
import { Team } from "./Team";

interface IssueParameters {
  issuetype: { name: string };
  labels?: string[];
  parent?: { key: string };
  reporter?: { id: string };
  customfield_10001?: string; // This is how Pattlasian* named teamId in Jira
  customfield_10020?: number; // How would you name a sprintId? Oh, I know...
}

export class NewIssueData {
  public readonly projectKey: string;
  public readonly accountId: string;
  public readonly additionalFields: any;

  private constructor(projectKey: string, accountId: string, additionalFields: any) {
    this.projectKey = projectKey;
    this.accountId = accountId;
    this.additionalFields = additionalFields;
  }

  public static async create(jira: JiraClient, pr: PullRequest, inputJiraProject: string, inputAdditionFields: string, userEmail: string): Promise<NewIssueData> {
    const parent = pr.isRenovate() || pr.isDependabot()
      ? null  // Description contains release notes with irrelevant issue IDs
      : await this.findNonSubTaskParent(jira, this.findMentionedIssues(pr));
    const projectKey = this.computeProjectKey(inputJiraProject, parent);
    if (projectKey) {
      const accountId = await jira.findAccountId(userEmail);
      const additionalFields = this.parseAdditionalFields(inputAdditionFields);
      const parameters = this.newIssueParameters(projectKey, parent, additionalFields.issuetype?.name ?? 'Task'); // Transfer issuetype name manually, because parameters should have priority due to Sub-task.
      if (parameters.issuetype.name !== 'Sub-task') {                   // These fields cannot be set on Sub-task. Their values are inherited from the parent issue.
        const team = await this.findTeam(jira, accountId, projectKey);  // Can be null for bots when project lead is not member of any team. Jira request will fail if the field is mandatory for the project.
        if (team != null) {
          const sprintId = await this.findSprintId(jira, team.name);
          parameters.customfield_10001 = team.id;
          parameters.customfield_10020 = sprintId;
        }
      }
      return new NewIssueData(projectKey, accountId, { ...additionalFields, ...parameters });
    } else {
      console.log('No suitable project key found, issue will not be created');
      return null;
    }
  }

  public static async createForEngExp(jira: JiraClient, pr: PullRequest, userEmail: string): Promise<NewIssueData> {
    const accountId = await jira.findAccountId(userEmail);
    const projectKey = await this.computeProjectKeyForEngExp(jira, pr, accountId);
    const parameters = this.newIssueParameters(projectKey, null, 'Task');
    const sprintId = await this.findSprintId(jira, EngineeringExperienceSquad.name);
    if (accountId) {
      parameters.reporter = { id: accountId };
    }
    parameters.customfield_10001 = EngineeringExperienceSquad.id;
    parameters.customfield_10020 = sprintId;
    parameters.labels = pr.isRenovate()
      ? ['dvi-created-by-automation', 'dvi-renovate']
      : ['dvi-created-by-automation'];
    return new NewIssueData(projectKey, accountId, parameters);
  }

  private static computeProjectKey(inputJiraProject: string, parent: any): string {
    return parent && !["Epic", "Sub-task"].includes(parent.fields.issuetype.name)
      ? parent.fields.project.key // If someone takes the explicit effort of specifying "Part of XYZ-123", it should take precedence.
      : inputJiraProject;         // Can be null. Like in rspec where we want only to create Sub-tasks in other tasks (not Epics).
  }

  private static async computeProjectKeyForEngExp(jira: JiraClient, pr: PullRequest, accountId: string): Promise<string> {
    if (pr.base.repo.name === 'parent-oss') {
      return 'PARENTOSS';
    } else if (accountId) {
      const team = await jira.findTeam(accountId);
      return team?.name === EngineeringExperienceSquad.name ? 'BUILD' : 'PREQ';
    } else {  // renovate and similar bots
      return 'BUILD';
    }
  }

  private static parseAdditionalFields(inputAdditionFields: string): any {
    if (inputAdditionFields) {
      try {
        return JSON.parse(inputAdditionFields);
      } catch (error) {
        console.log(`Unable to parse additional-fields: ${inputAdditionFields}`, error);
      }
    }
    return {};
  }

  private static newIssueParameters(projectKey: string, parent: any, issueType: string): IssueParameters {
    switch (parent?.fields.issuetype.name) {
      case 'Epic':
        return { issuetype: { name: issueType }, parent: { key: parent.key } };
      case 'Sub-task':
      case undefined:
      case null:
        return { issuetype: { name: issueType } };
      default:
        return parent.fields.project.key === projectKey   // Sub-task must be created in the same project
          ? { issuetype: { name: 'Sub-task' }, parent: { key: parent.key } }
          : { issuetype: { name: issueType } };
    }
  }

  private static async findNonSubTaskParent(jira: JiraClient, issues: Set<string>): Promise<any> {
    console.log('Looking for a non-Sub-task ticket');
    for (const issueKey of issues) {
      const issue = await jira.getIssue(issueKey);
      if (issue && issue.fields.issuetype.name !== 'Sub-task') {
        console.log(`Parent issue: ${issue.key} ${issue.fields.issuetype.name}`);
        return issue;
      }
    }
    console.log('No parent issue found');
    return null;
  }

  private static findMentionedIssues(pr: PullRequest): Set<string> {
    const mentionedIssues = pr.body?.match(JIRA_ISSUE_PATTERN) || [];
    console.log(mentionedIssues.length > 0 ? `Found mentioned issues: ${mentionedIssues}` : 'No mentioned issues found');
    return new Set(mentionedIssues);
  }

  private static async findTeam(jira: JiraClient, userAccountId: string, projectKey: string): Promise<Team> {
    if (userAccountId != null) {
      const team = await jira.findTeam(userAccountId);
      if (team != null) {
        return team;
      }
    }
    const { lead: { accountId: leadAccountId, displayName } } = await jira.getProject(projectKey);
    console.log(`No team found for current user, using ${projectKey} lead ${displayName}`);
    return jira.findTeam(leadAccountId);
  }

  private static async findSprintId(jira: JiraClient, teamName: string): Promise<number> {
    const team = Config.findTeam(teamName);
    if (team?.boardId) {
      return jira.findSprintId(team.boardId);
    }
    else {
      console.log(`No boardId is configured for team ${teamName}`);
      return null;
    }
  }
}
