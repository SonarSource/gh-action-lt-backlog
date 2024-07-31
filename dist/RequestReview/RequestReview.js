"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const PullRequestAction_1 = require("../lib/PullRequestAction");
class RequestReview extends PullRequestAction_1.PullRequestAction {
    async processJiraIssue(issueId) {
        await this.jira.moveIssue(issueId, 'Request Review');
        const userEmail = await this.findEmail(this.payload.requested_reviewer.login);
        if (userEmail != null) {
            await this.jira.assignIssue(issueId, userEmail);
        }
    }
}
const action = new RequestReview();
action.run();
//# sourceMappingURL=RequestReview.js.map