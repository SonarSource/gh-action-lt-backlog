"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const PullRequestAction_1 = require("../lib/PullRequestAction");
class MoveCardToReview extends PullRequestAction_1.PullRequestAction {
    async processReassignment(issueOrPR) {
        if (issueOrPR.state === 'open') {
            await this.reassignIssue(issueOrPR, this.payload.requested_reviewer.login);
        }
    }
}
const action = new MoveCardToReview();
action.run();
//# sourceMappingURL=MoveCardToReview.js.map