"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const PullRequestAction_1 = require("../lib/PullRequestAction");
class RequestReview extends PullRequestAction_1.PullRequestAction {
    async processJiraIssue(issueId) {
        await this.processRequestReview(issueId, this.payload.requested_reviewer); // When team is requested for a review, it has this.payload.requested_team
    }
}
const action = new RequestReview();
action.run();
//# sourceMappingURL=RequestReview.js.map