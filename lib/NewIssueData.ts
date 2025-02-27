import { JIRA_ISSUE_PATTERN } from "./Constants";
import { JiraClient } from "./JiraClient";
import { PullRequest } from "./OctokitTypes";

interface IssueParameters {
  issuetype: { name: string };
  parent?: { key: string };
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
    const parent = await this.findNonSubTaskParent(jira, this.findMentionedIssues(pr));
    const projectKey = this.computeProjectKey(inputJiraProject, parent);
    const accountId = await jira.findAccountId(userEmail);
    // ToDo: teamId = f(accountId, project(projectKey).lead)
    // ToDo: boardId = f(teamId)
    // ToDo: sprintId = f(boardId)
    let additionalFields = this.parseAdditionalFields(inputAdditionFields);
    const parameters = this.newIssueParameters(projectKey, parent, additionalFields.issuetype?.name ?? 'Task'); // Transfer issuetype name manually, because parameters should have priority due to Sub-task.
    additionalFields = { ...additionalFields, ...parameters };
    return new NewIssueData(projectKey, accountId, additionalFields);
  }

  private static computeProjectKey(inputJiraProject:string, parent: any): string {
    // If projectKey is not defined (like in rspec), we want only to create only Sub-tasks in other tasks (not Epics).
    if (inputJiraProject) {
      return inputJiraProject;
    } else if (parent && !["Epic", "Sub-task"].includes(parent.fields.issuetype.name)) {
      return parent.fields.project.key;
    } else {
      return null;
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
      if (issue?.fields.issuetype.name !== 'Sub-task') {
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
}
