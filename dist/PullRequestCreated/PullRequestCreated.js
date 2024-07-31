"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const OctokitAction_1 = require("../lib/OctokitAction");
const Constants_1 = require("../lib/Constants");
class PullRequestCreated extends OctokitAction_1.OctokitAction {
    async execute() {
        const pr = await this.getPullRequest(this.payload.pull_request.number);
        if (this.shouldCreateIssue(pr)) {
            const issueParameter = await this.newIssueParameters(pr);
            const projectKey = this.getInput('jira-project');
            const issueKey = await this.jira.createIssue(projectKey, issueParameter.type, pr.title, { parent: { key: issueParameter.parent } });
            if (issueKey != null) {
                await this.updatePullRequestTitle(this.payload.pull_request.number, `${issueKey} ${pr.title}`);
                await this.updatePullRequestDescription(this.payload.pull_request.number, `${issueKey}\n\n${pr.body || ''}`);
            }
            else {
                console.log('Unable to update PR title and description');
            }
        }
    }
    shouldCreateIssue(pr) {
        return pr != null && !Constants_1.JIRA_ISSUE_PATTERN.test(pr.title);
    }
    async newIssueParameters(pr) {
        const mentionedIssues = this.findMentionedIssues(pr);
        console.log(`Found mentioned issues: ${mentionedIssues}`);
        const parent = mentionedIssues.length === 1 ? await this.jira.getIssue(mentionedIssues[0]) : null;
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
    findMentionedIssues(pr) {
        return pr.body?.match(Constants_1.JIRA_ISSUE_PATTERN) || [];
    }
}
const action = new PullRequestCreated();
action.run();
//# sourceMappingURL=PullRequestCreated.js.map