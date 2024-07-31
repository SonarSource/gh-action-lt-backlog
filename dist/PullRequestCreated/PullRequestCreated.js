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
        const linkedIssues = pr.title?.match(Constants_1.JIRA_ISSUE_PATTERN) || null;
        if (linkedIssues == null) {
            const parameters = await this.newIssueParameters(pr);
            const projectKey = this.getInput('jira-project');
            const issueKey = await this.jira.createIssue(projectKey, parameters.type, pr.title, { parent: { key: parameters.parent } });
            if (issueKey != null) {
                await this.updatePullRequestTitle(this.payload.pull_request.number, `${issueKey} ${pr.title}`);
                await this.updatePullRequestDescription(this.payload.pull_request.number, `${this.issueLink(issueKey)}\n\n${pr.body || ''}`);
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
            const notMentionedIssues = linkedIssues.filter(x => !mentionedIssues.includes(x));
            console.log(`Adding the following ticket in description: ${notMentionedIssues}`);
            if (notMentionedIssues.length > 0) {
                await this.updatePullRequestDescription(this.payload.pull_request.number, `${notMentionedIssues.map(x => this.issueLink(x)).join('\n')}\n\n${pr.body || ''}`);
            }
        }
    }
    async newIssueParameters(pr) {
        const mentionedIssues = this.findMentionedIssues(pr);
        console.log(`Found mentioned issues: ${mentionedIssues}`);
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
        console.log('Looking for a non-Sub-task ticket');
        for (const issueKey of issues) {
            const issue = await this.jira.getIssue(issueKey);
            if (issue?.fields.issuetype.name !== 'Sub-task') {
                return issue;
            }
        }
        return null;
    }
    findMentionedIssues(pr) {
        return [...new Set(pr.body?.match(Constants_1.JIRA_ISSUE_PATTERN) || [])];
    }
    issueLink(issue) {
        return `[${issue}](${Constants_1.JIRA_DOMAIN}/browse/${issue})`;
    }
}
const action = new PullRequestCreated();
action.run();
//# sourceMappingURL=PullRequestCreated.js.map