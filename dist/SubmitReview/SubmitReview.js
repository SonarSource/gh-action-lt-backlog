"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubmitReview = void 0;
const PullRequestAction_1 = require("../lib/PullRequestAction");
class SubmitReview extends PullRequestAction_1.PullRequestAction {
    async processJiraIssue(issueId) {
        if (this.payload.review.state === 'approved') {
            if (this.isEngXpSquad) {
                const userEmail = await this.findEmail(this.payload.sender.login);
                if (userEmail) {
                    await this.jira.addReviewedBy(issueId, userEmail);
                }
            }
            else {
                await this.jira.moveIssue(issueId, 'Approve');
            }
        }
        else if (this.payload.review.state === 'changes_requested') {
            await this.jira.moveIssue(issueId, 'Request Changes');
        }
    }
}
exports.SubmitReview = SubmitReview;
//# sourceMappingURL=SubmitReview.js.map