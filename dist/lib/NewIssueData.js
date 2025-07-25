"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NewIssueData = void 0;
const TeamConfiguration_1 = require("../Data/TeamConfiguration");
const Configuration_1 = require("./Configuration");
const Constants_1 = require("./Constants");
class NewIssueData {
    projectKey;
    accountId;
    additionalFields;
    constructor(projectKey, accountId, additionalFields) {
        this.projectKey = projectKey;
        this.accountId = accountId;
        this.additionalFields = additionalFields;
    }
    static async create(jira, pr, inputJiraProject, inputAdditionFields, userEmail, fallbackTeam) {
        const parent = pr.isRenovate() || pr.isDependabot()
            ? null // Description contains release notes with irrelevant issue IDs
            : await this.findNonSubTaskParent(jira, this.findMentionedIssues(pr));
        const projectKey = this.computeProjectKey(inputJiraProject, parent);
        if (projectKey) {
            const accountId = await jira.findAccountId(userEmail);
            const additionalFields = this.parseAdditionalFields(inputAdditionFields);
            const parameters = this.newIssueParameters(projectKey, parent, additionalFields.issuetype?.name ?? 'Task'); // Transfer issuetype name manually, because parameters should have priority due to Sub-task.
            if (parameters.issuetype.name !== 'Sub-task') { // These fields cannot be set on Sub-task. Their values are inherited from the parent issue.
                const team = await this.findTeam(jira, accountId, projectKey, fallbackTeam); // Can be null for bots when project lead is not member of any team, and fallbackTeam is not set. Jira request will fail if the field is mandatory for the project.
                if (team != null) {
                    const sprintId = await this.findSprintId(jira, team.name);
                    parameters.customfield_10001 = team.id;
                    parameters.customfield_10020 = sprintId;
                }
            }
            return new NewIssueData(projectKey, accountId, { ...additionalFields, ...parameters });
        }
        else {
            console.log('No suitable project key found, issue will not be created');
            return null;
        }
    }
    static async createForEngExp(jira, pr, userEmail) {
        const accountId = await jira.findAccountId(userEmail);
        const projectKey = await this.computeProjectKeyForEngExp(jira, pr, accountId);
        const parameters = this.newIssueParameters(projectKey, null, 'Task');
        const sprintId = await this.findSprintId(jira, TeamConfiguration_1.EngineeringExperienceSquad.name);
        if (accountId) {
            parameters.reporter = { id: accountId };
        }
        parameters.customfield_10001 = TeamConfiguration_1.EngineeringExperienceSquad.id;
        parameters.customfield_10020 = sprintId;
        parameters.labels = pr.isRenovate()
            ? ['dvi-created-by-automation', 'dvi-renovate']
            : ['dvi-created-by-automation'];
        return new NewIssueData(projectKey, accountId, parameters);
    }
    static computeProjectKey(inputJiraProject, parent) {
        return parent && !["Epic", "Sub-task"].includes(parent.fields.issuetype.name)
            ? parent.fields.project.key // If someone takes the explicit effort of specifying "Part of XYZ-123", it should take precedence.
            : inputJiraProject; // Can be null. Like in rspec where we want only to create Sub-tasks in other tasks (not Epics).
    }
    static async computeProjectKeyForEngExp(jira, pr, accountId) {
        if (pr.base.repo.name === 'parent-oss') {
            return 'PARENTOSS';
        }
        else if (accountId) {
            const team = await jira.findTeamByUser(accountId);
            return team?.name === TeamConfiguration_1.EngineeringExperienceSquad.name ? 'BUILD' : 'PREQ';
        }
        else { // renovate and similar bots
            return 'BUILD';
        }
    }
    static parseAdditionalFields(inputAdditionFields) {
        if (inputAdditionFields) {
            try {
                return JSON.parse(inputAdditionFields);
            }
            catch (error) {
                console.log(`Unable to parse additional-fields: ${inputAdditionFields}`, error);
            }
        }
        return {};
    }
    static newIssueParameters(projectKey, parent, issueType) {
        switch (parent?.fields.issuetype.name) {
            case 'Epic':
                return { issuetype: { name: issueType }, parent: { key: parent.key } };
            case 'Sub-task':
            case undefined:
            case null:
                return { issuetype: { name: issueType } };
            default:
                return parent.fields.project.key === projectKey // Sub-task must be created in the same project
                    ? { issuetype: { name: 'Sub-task' }, parent: { key: parent.key } }
                    : { issuetype: { name: issueType } };
        }
    }
    static async findNonSubTaskParent(jira, issues) {
        console.log('Looking for a non-Sub-task ticket');
        for (const issueKey of issues) {
            if (issueKey.startsWith("BUILD-") || issueKey.startsWith("PREQ-")) {
                console.log(`Ignoring Eng. Xp Squad project: ${issueKey}`);
            }
            else {
                const issue = await jira.loadIssue(issueKey);
                if (issue && issue.fields.issuetype.name !== 'Sub-task') {
                    console.log(`Parent issue: ${issue.key} ${issue.fields.issuetype.name}`);
                    return issue;
                }
            }
        }
        console.log('No parent issue found');
        return null;
    }
    static findMentionedIssues(pr) {
        const mentionedIssues = pr.body?.match(Constants_1.JIRA_ISSUE_PATTERN) ?? [];
        console.log(mentionedIssues.length > 0 ? `Found mentioned issues: ${mentionedIssues}` : 'No mentioned issues found');
        return new Set(mentionedIssues);
    }
    static async findTeam(jira, userAccountId, projectKey, fallbackTeam) {
        if (userAccountId) {
            const team = await jira.findTeamByUser(userAccountId);
            if (team) {
                return team;
            }
        }
        if (fallbackTeam) {
            const team = await jira.findTeamByName(fallbackTeam);
            if (team) {
                return team;
            }
        }
        const { lead: { accountId: leadAccountId, displayName } } = await jira.loadProject(projectKey);
        console.log(`No team found for current user, using ${projectKey} lead ${displayName}`);
        return jira.findTeamByUser(leadAccountId);
    }
    static async findSprintId(jira, teamName) {
        const team = Configuration_1.Config.findTeam(teamName);
        if (team?.boardId) {
            return jira.findSprintId(team.boardId);
        }
        else {
            console.log(`No boardId is configured for team ${teamName}`);
            return null;
        }
    }
}
exports.NewIssueData = NewIssueData;
//# sourceMappingURL=NewIssueData.js.map