"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const PullRequestAction_1 = require("../lib/PullRequestAction");
class PullRequestClosed extends PullRequestAction_1.PullRequestAction {
    async processJiraIssue(issueId) {
        const transition = await this.jira.findTransition(issueId, this.isReleaseBranch(this.payload.pull_request.base.ref) ? 'Merge into master' : 'Merge into branch');
        if (transition == null) {
            await this.jira.moveIssue(issueId, 'Merge');
        }
        else {
            await this.jira.transitionIssue(issueId, transition);
        }
    }
    isReleaseBranch(ref) {
        return ref === 'master' || ref === 'main' || ref.startsWith('branch-');
    }
}
const action = new PullRequestClosed();
action.run();
//# sourceMappingURL=PullRequestClosed.js.map