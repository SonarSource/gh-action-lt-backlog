"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const PullRequestAction_1 = require("../lib/PullRequestAction");
class PullRequestClosed extends PullRequestAction_1.PullRequestAction {
    async processJiraIssue(issueId) {
        this.moveIssue(issueId, this.isFinalBranch(this.payload.pull_request.base.ref) ? "Merge into master" : "Merge into branch");
    }
    isFinalBranch(ref) {
        return ref === 'master' || ref === 'main' || ref.startsWith('branch-');
    }
}
const action = new PullRequestClosed();
action.run();
//# sourceMappingURL=PullRequestClosed.js.map