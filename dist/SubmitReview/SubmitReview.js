"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const PullRequestAction_1 = require("../lib/PullRequestAction");
class SubmitReview extends PullRequestAction_1.PullRequestAction {
    async processJiraIssue(issueId) {
        if (this.payload.review.state === 'approved') {
            await this.moveIssue(issueId, 'Approve');
        }
        else if (this.payload.review.state === 'changes_requested') {
            await this.moveIssue(issueId, 'Request Changes');
        }
    }
}
const action = new SubmitReview();
action.run();
//# sourceMappingURL=SubmitReview.js.map