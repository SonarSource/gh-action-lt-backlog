"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NewIssueData = void 0;
const Configuration_1 = require("./Configuration");
const Constants_1 = require("./Constants");
class NewIssueData {
    constructor(projectKey, accountId, additionalFields) {
        this.projectKey = projectKey;
        this.accountId = accountId;
        this.additionalFields = additionalFields;
    }
    static async create(jira, pr, inputJiraProject, inputAdditionFields, userEmail) {
        const parent = await this.findNonSubTaskParent(jira, this.findMentionedIssues(pr));
        const projectKey = this.computeProjectKey(inputJiraProject, parent);
        const accountId = await jira.findAccountId(userEmail);
        const team = await this.findTeam(jira, accountId, projectKey); // Can be null for bots when project lead is not member of any team. Jira request will fail if the field is mandatory for the project.
        const sprintId = await this.findSprintId(jira, team.name);
        let additionalFields = this.parseAdditionalFields(inputAdditionFields);
        const parameters = this.newIssueParameters(projectKey, parent, additionalFields.issuetype?.name ?? 'Task'); // Transfer issuetype name manually, because parameters should have priority due to Sub-task.
        if (parameters.issuetype.name !== 'Sub-task') { // These fields cannot be set on Sub-task. Their values are inherited from the parent issue.
            parameters.customfield_10001 = team.id;
            parameters.customfield_10020 = sprintId;
        }
        additionalFields = { ...additionalFields, ...parameters };
        return new NewIssueData(projectKey, accountId, additionalFields);
    }
    static computeProjectKey(inputJiraProject, parent) {
        // If projectKey is not defined (like in rspec), we want only to create only Sub-tasks in other tasks (not Epics).
        if (inputJiraProject) {
            return inputJiraProject;
        }
        else if (parent && !["Epic", "Sub-task"].includes(parent.fields.issuetype.name)) {
            return parent.fields.project.key;
        }
        else {
            return null;
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
            const issue = await jira.getIssue(issueKey);
            if (issue?.fields.issuetype.name !== 'Sub-task') {
                console.log(`Parent issue: ${issue.key} ${issue.fields.issuetype.name}`);
                return issue;
            }
        }
        console.log('No parent issue found');
        return null;
    }
    static findMentionedIssues(pr) {
        const mentionedIssues = pr.body?.match(Constants_1.JIRA_ISSUE_PATTERN) || [];
        console.log(mentionedIssues.length > 0 ? `Found mentioned issues: ${mentionedIssues}` : 'No mentioned issues found');
        return new Set(mentionedIssues);
    }
    static async findTeam(jira, userAccountId, projectKey) {
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