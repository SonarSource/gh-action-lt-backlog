"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const PullRequestAction_1 = require("../lib/PullRequestAction");
class SubmitReview extends PullRequestAction_1.PullRequestAction {
    async processJiraIssue(issueId) {
        await this.moveIssue(issueId, "Request Changes");
    }
}
const action = new SubmitReview();
action.run();
//# sourceMappingURL=RequestChanges.js.map