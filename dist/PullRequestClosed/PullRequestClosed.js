"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const PullRequestAction_1 = require("../lib/PullRequestAction");
class PullRequestClosed extends PullRequestAction_1.PullRequestAction {
    async processJiraIssue(issueId) {
        if (this.payload.pull_request.merged) {
            await this.processMerge(issueId);
        }
        else {
            await this.processClose(issueId);
        }
    }
    async processMerge(issueId) {
        const transition = await this.jira.findTransition(issueId, this.isReleaseBranch(this.payload.pull_request.base.ref) ? 'Merge into master' : 'Merge into branch');
        if (transition == null) {
            await this.jira.moveIssue(issueId, 'Merge');
        }
        else {
            await this.jira.transitionIssue(issueId, transition);
        }
    }
    async processClose(issueId) {
        const issue = await this.jira.getIssue(issueId);
        const creator = issue?.fields.creator.displayName;
        if (creator === "Jira Tech User GitHub") {
            await this.jira.moveIssue(issueId, 'Cancel Issue', { resolution: { id: '10001' } }); // 10001 "Won't do"
        }
        else {
            this.log(`Skipping issue cancellation for creator ${creator}`);
        }
    }
    isReleaseBranch(ref) {
        return ref === 'master' || ref === 'main' || ref.startsWith('branch-');
    }
}
const action = new PullRequestClosed();
action.run();
//# sourceMappingURL=PullRequestClosed.js.map