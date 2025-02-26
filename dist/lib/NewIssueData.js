"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NewIssueData = void 0;
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
        const teamId = await this.findTeamId(jira, accountId, projectKey); // Can be null for bots when project lead is not member of any team. Jira request will fail if the field is mandatory for the project.
        // ToDo: boardId = f(teamId)
        // ToDo: sprintId = f(boardId)
        let additionalFields = this.parseAdditionalFields(inputAdditionFields);
        const parameters = this.newIssueParameters(projectKey, parent, additionalFields.issuetype?.name ?? 'Task', teamId); // Transfer issuetype name manually, because parameters should have priority due to Sub-task.
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
    static newIssueParameters(projectKey, parent, issueType, teamId) {
        switch (parent?.fields.issuetype.name) {
            case 'Epic':
                return { issuetype: { name: issueType }, parent: { key: parent.key }, customfield_10001: teamId };
            case 'Sub-task':
            case undefined:
            case null:
                return { issuetype: { name: issueType }, customfield_10001: teamId };
            default:
                return parent.fields.project.key === projectKey // Sub-task must be created in the same project
                    ? { issuetype: { name: 'Sub-task' }, parent: { key: parent.key } } // Team cannot be set on Sub-Task
                    : { issuetype: { name: issueType }, customfield_10001: teamId };
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
    static async findTeamId(jira, userAccountId, projectKey) {
        if (userAccountId != null) {
            const teamId = await jira.findTeamId(userAccountId);
            if (teamId != null) {
                return teamId;
            }
        }
        const { lead: { accountId: leadAccountId, displayName } } = await jira.getProject(projectKey);
        console.log(`No team found for current user, using ${projectKey} lead ${displayName}`);
        return jira.findTeamId(leadAccountId);
    }
}
exports.NewIssueData = NewIssueData;
//# sourceMappingURL=NewIssueData.js.map