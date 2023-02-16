"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const PullRequestAction_1 = require("../lib/PullRequestAction");
class MoveCardAfterReview extends PullRequestAction_1.PullRequestAction {
    async processReassignment(issueOrPR) {
        await this.reassignIssue(issueOrPR, this.payload.pull_request.user.login); // Also for closed issues
    }
}
const action = new MoveCardAfterReview();
action.run();
//# sourceMappingURL=index.js.map