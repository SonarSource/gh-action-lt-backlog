"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const OctokitAction_1 = require("../lib/OctokitAction");
const Constants_1 = require("../lib/Constants");
class PullRequestCreated extends OctokitAction_1.OctokitAction {
    async execute() {
        const pr = await this.getPullRequest(this.payload.pull_request.number);
        const linkedIssues = pr?.title?.match(Constants_1.JIRA_ISSUE_PATTERN) || null;
        if (pr != null && linkedIssues == null) {
            const projectKey = this.getInput('jira-project');
            const issueKey = await this.jira.createIssue(projectKey, Constants_1.JIRA_TASK_ISSUE, pr.title);
            await this.updatePullRequestTitle(this.payload.pull_request.number, `${issueKey} ${pr.title}`);
            await this.updatePullRequestDescription(this.payload.pull_request.number, `${issueKey}\n\n${pr.body || ''}`);
        }
        else if (pr != null) {
            const mentionedIssues = this.findMentionedIssues(pr);
            const notMentionedIssues = linkedIssues.filter(issue => !mentionedIssues.includes(issue));
            console.log(`Adding the following ticket in description: ${notMentionedIssues}`);
            if (notMentionedIssues.length > 0) {
                await this.updatePullRequestDescription(this.payload.pull_request.number, `${notMentionedIssues.join('\n')}\n\n${pr.body || ''}`);
            }
        }
    }
    findMentionedIssues(pr) {
        return pr.body?.match(Constants_1.JIRA_ISSUE_PATTERN) || [];
    }
}
const action = new PullRequestCreated();
action.run();
//# sourceMappingURL=PullRequestCreated.js.map