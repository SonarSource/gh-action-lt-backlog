"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PullRequestAction = void 0;
const Constants_1 = require("./Constants");
const OctokitAction_1 = require("./OctokitAction");
class PullRequestAction extends OctokitAction_1.OctokitAction {
    async execute() {
        const issueIds = await this.fixedJiraIssues();
        if (issueIds.length === 0) {
            console.warn('No Jira issue found in the PR title.');
        }
        else {
            for (const issueId of issueIds) {
                if (issueId.startsWith('BUILD-')) {
                    this.log(`Skipping $(issueId)`);
                }
                else {
                    await this.processJiraIssue(issueId);
                }
            }
        }
    }
    async fixedJiraIssues() {
        const pr = await this.getPullRequest(this.payload.pull_request.number);
        return pr?.title.match(Constants_1.JIRA_ISSUE_PATTERN) || [];
    }
}
exports.PullRequestAction = PullRequestAction;
//# sourceMappingURL=PullRequestAction.js.map