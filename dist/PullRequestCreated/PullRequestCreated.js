"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const OctokitAction_1 = require("../lib/OctokitAction");
const Constants_1 = require("../lib/Constants");
class PullRequestCreated extends OctokitAction_1.OctokitAction {
    async execute() {
        const pr = await this.getPullRequest(this.payload.pull_request.number);
        if (pr == null) {
            return;
        }
        let newTitle = pr.title.replace(/\s\s+/g, " ").trim(); // Mainly remove triple space between issue ID and title when copying from Jira
        const linkedIssues = pr.title?.match(Constants_1.JIRA_ISSUE_PATTERN) || null;
        if (linkedIssues == null) {
            const parameters = await this.newIssueParameters(pr);
            const projectKey = this.getInput('jira-project');
            const issueKey = await this.jira.createIssue(projectKey, parameters.type, pr.title, this.additionalFields(parameters));
            if (issueKey != null) {
                newTitle = `${issueKey} ${newTitle}`;
                await this.updatePullRequestDescription(pr.number, `${this.issueLink(issueKey)}\n\n${pr.body || ''}`);
                await this.jira.moveIssue(issueKey, 'Commit'); // OPEN  -> TO DO
                await this.jira.moveIssue(issueKey, 'Start'); // TO DO -> IN PROGRESS
                const userEmail = await this.findEmail(this.payload.sender.login);
                if (userEmail != null) {
                    await this.jira.assignIssue(issueKey, userEmail);
                }
            }
        }
        else {
            const mentionedIssues = this.findMentionedIssues(pr);
            const notMentionedIssues = linkedIssues.filter(x => !mentionedIssues.has(x));
            console.log(`Adding the following ticket in description: ${notMentionedIssues}`);
            if (notMentionedIssues.length > 0) {
                await this.updatePullRequestDescription(pr.number, `${notMentionedIssues.map(x => this.issueLink(x)).join('\n')}\n\n${pr.body || ''}`);
            }
        }
        if (pr.title !== newTitle) {
            await this.updatePullRequestTitle(pr.number, newTitle);
        }
    }
    additionalFields(parameters) {
        let addutinalFields = {};
        if (parameters?.parent) {
            addutinalFields = { parent: { key: parameters.parent } };
        }
        const inputAdditionFields = this.getInput('additional-fields');
        if (inputAdditionFields) {
            try {
                const fields = JSON.parse(inputAdditionFields);
                addutinalFields = { ...addutinalFields, ...fields };
            }
            catch (error) {
                console.log(`Unable to parse additional-fields: ${inputAdditionFields}`, error);
            }
        }
        return addutinalFields;
    }
    async newIssueParameters(pr) {
        const mentionedIssues = this.findMentionedIssues(pr);
        console.log('Looking for a non-Sub-task ticket');
        const parent = await this.firstNonSubTask(mentionedIssues);
        console.log(`Parent issue: ${parent?.key} (${parent?.fields.issuetype.name})`);
        switch (parent?.fields.issuetype.name) {
            case 'Epic':
                return { type: 'Task', parent: parent.key };
            case 'Sub-task':
            case undefined:
            case null:
                return { type: 'Task' };
            default:
                return { type: 'Sub-task', parent: parent.key };
        }
    }
    async firstNonSubTask(issues) {
        for (const issueKey of issues) {
            const issue = await this.jira.getIssue(issueKey);
            if (issue?.fields.issuetype.name !== 'Sub-task') {
                return issue;
            }
        }
        return null;
    }
    findMentionedIssues(pr) {
        const mentionedIssues = pr.body?.match(Constants_1.JIRA_ISSUE_PATTERN) || [];
        console.log(`Found mentioned issues: ${mentionedIssues} (prior to distinct)`);
        return new Set(mentionedIssues);
    }
    issueLink(issue) {
        return `[${issue}](${Constants_1.JIRA_DOMAIN}/browse/${issue})`;
    }
}
const action = new PullRequestCreated();
action.run();
//# sourceMappingURL=PullRequestCreated.js.map