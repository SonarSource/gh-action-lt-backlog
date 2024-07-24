"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PullRequestAction = void 0;
const OctokitAction_1 = require("./OctokitAction");
class PullRequestAction extends OctokitAction_1.OctokitAction {
    async execute() {
        const issueIds = await this.fixedJiraIssues();
        if (issueIds.length === 0) {
            console.warn('No Jira issue found in the PR title.');
        }
        for (const issueId of issueIds) {
            await this.processJiraIssue(issueId);
        }
    }
    async fixedJiraIssues() {
        let pullRequest = await this.getPullRequest(this.payload.pull_request.number);
        if (pullRequest == null) {
            console.log('Pull request not found.');
        }
        return pullRequest?.title.match(/[A-Z]+-\d+/g) || [];
    }
}
exports.PullRequestAction = PullRequestAction;
//# sourceMappingURL=PullRequestAction.js.map