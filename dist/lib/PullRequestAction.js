"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PullRequestAction = void 0;
const OctokitAction_1 = require("./OctokitAction");
class PullRequestAction extends OctokitAction_1.OctokitAction {
    async execute() {
        const issueIds = await this.fixedJiraIssues();
        if (issueIds.length === 0) {
            console.log('No Jira issue found in the PR title.');
        }
        else {
            for (const issueId of issueIds) {
                // BUILD/PREQ tickets are processed only when they are from Engineering Experience Squad repos. They should be ignored in any other repo, not to interfere with their process.
                if ((issueId.startsWith('BUILD-') || issueId.startsWith('PREQ-')) && !this.isEngXpSquad) {
                    this.log(`Skipping ${issueId}`);
                }
                else {
                    await this.processJiraIssue(issueId);
                }
            }
        }
    }
    async fixedJiraIssues() {
        const pr = await this.loadPullRequest(this.payload.pull_request.number);
        return pr
            ? (await this.findFixedIssues(pr)) ?? []
            : [];
    }
}
exports.PullRequestAction = PullRequestAction;
//# sourceMappingURL=PullRequestAction.js.map