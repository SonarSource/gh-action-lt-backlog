"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const PullRequestActionV2_1 = require("../lib/PullRequestActionV2");
class MoveCardAfterReviewV2 extends PullRequestActionV2_1.PullRequestActionV2 {
    async processReassignment(issueOrPR) {
        const login = this.payload.requested_reviewer.login;
        const newUserId = await this.getUserId(login);
        const oldUserIds = issueOrPR.assignees.map(assignee => assignee.id);
        await this.reassignIssueV2(issueOrPR, newUserId, oldUserIds); // Also for closed issues
    }
}
const action = new MoveCardAfterReviewV2();
action.run();
//# sourceMappingURL=MoveCardAfterReviewV2.js.map