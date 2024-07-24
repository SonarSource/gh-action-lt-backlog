"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PullRequestAction = void 0;
const OctokitAction_1 = require("./OctokitAction");
class PullRequestAction extends OctokitAction_1.OctokitAction {
    async execute() {
        const issueIds = await this.getLinkedJiraIssues();
        if (issueIds.length === 0) {
            console.warn('No JIRA issue found in the PR title.');
        }
        for (const issueId of issueIds) {
            await this.processJiraIssue(issueId);
        }
    }
    async getLinkedJiraIssues() {
        return ["PAVEL-26"];
        let pullRequest = await this.getPullRequest(this.payload.pull_request.number);
        if (!pullRequest) {
            // This can happen in case GITHUB_TOKEN does not have sufficient permissions
            // More info: https://docs.github.com/en/actions/security-guides/automatic-token-authentication#permissions-for-the-github_token
            throw new Error(`Pull request not found: #${this.payload.pull_request.number}. Please check GITHUB_TOKEN permissions.`);
        }
        return pullRequest.title.match(/[A-Z]+-\d+/g) || [];
    }
}
exports.PullRequestAction = PullRequestAction;
//# sourceMappingURL=PullRequestAction.js.map