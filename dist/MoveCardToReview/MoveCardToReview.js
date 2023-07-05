"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const PullRequestAction_1 = require("../lib/PullRequestAction");
class MoveCardToReview extends PullRequestAction_1.PullRequestAction {
    async processReassignment(issueOrPR) {
        if (issueOrPR.state === 'open') {
            const login = this.payload.requested_reviewer.login;
            if (login) {
                await this.reassignIssue(issueOrPR, login);
            }
            else {
                // Review requested from a group - keep it unassigned to raise a suspicion about the card
                await this.removeAssignees(issueOrPR);
            }
        }
    }
}
const action = new MoveCardToReview();
action.run();
//# sourceMappingURL=MoveCardToReview.js.map