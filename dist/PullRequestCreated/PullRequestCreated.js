"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const OctokitAction_1 = require("../lib/OctokitAction");
const Constants_1 = require("../lib/Constants");
class PullRequestCreated extends OctokitAction_1.OctokitAction {
    async execute() {
        const pr = await this.getPullRequest(this.payload.pull_request.number);
        if (this.shouldCreateIssue(pr)) {
            const projectKey = this.getInput('jira-project');
            const issueKey = await this.jira.createIssue(projectKey, Constants_1.JIRA_TASK_ISSUE, pr.title);
            await this.updatePullRequestTitle(this.payload.pull_request.number, `${issueKey} ${pr.title}`);
            await this.updatePullRequestDescription(this.payload.pull_request.number, `${issueKey}\n\n${pr.body || ''}`);
        }
    }
    shouldCreateIssue(pr) {
        return pr != null && !Constants_1.JIRA_ISSUE_PATTERN.test(pr.title);
    }
}
const action = new PullRequestCreated();
action.run();
//# sourceMappingURL=PullRequestCreated.js.map