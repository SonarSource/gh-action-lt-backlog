"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const OctokitAction_1 = require("../lib/OctokitAction");
const Constants_1 = require("../lib/Constants");
class PullRequestCreated extends OctokitAction_1.OctokitAction {
    async execute() {
        const pr = await this.getPullRequest(this.payload.pull_request.number);
        if (this.shouldCreateIssue(pr)) {
            const issue = await this.newIssueTypeAndParent(pr);
            const projectKey = this.getInput('jira-project', true);
            const issueKey = await this.jira.createIssue(projectKey, issue.type, pr.title, { parent: { key: issue.parent } });
            await this.updatePullRequestTitle(this.payload.pull_request.number, `${issueKey} ${pr.title}`);
            await this.updatePullRequestDescription(this.payload.pull_request.number, `${issueKey}\n\n${pr.body || ''}`);
        }
    }
    shouldCreateIssue(pr) {
        return pr != null && !Constants_1.JIRA_ISSUE_PATTERN.test(pr.title);
    }
    async newIssueTypeAndParent(pr) {
        const mentionnedIssues = this.findMentionnedIssues(pr);
        console.log(`Found ${mentionnedIssues.length} mentionned issues: ${mentionnedIssues}`);
        let parent = mentionnedIssues.length === 1 ? await this.jira.getIssue(mentionnedIssues[0]) : null;
        console.log(`Parent issue: ${parent?.key} (${parent?.fields.issuetype.name})`);
        switch (parent?.fields.issuetype.name) {
            case 'Epic':
                return { type: 'Task', parent: parent.key };
            case 'Task':
                return { type: 'Sub-task', parent: parent.key };
            default:
                return { type: 'Task' };
        }
    }
    findMentionnedIssues(pr) {
        return pr.body?.match(Constants_1.JIRA_ISSUE_PATTERN) || [];
    }
}
const action = new PullRequestCreated();
action.run();
//# sourceMappingURL=PullRequestCreated.js.map