"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const PullRequestAction_1 = require("../lib/PullRequestAction");
class RequestReview extends PullRequestAction_1.PullRequestAction {
    async processJiraIssue(issueId) {
        this.moveIssue(issueId, 'Request Review');
        const userEmail = 'sebastien.marichal@sonarsource.com'; // FIXME: Map GitHub user to Jira user
        if (userEmail != null) {
            this.jira.assignIssue(issueId, userEmail);
        }
    }
}
const action = new RequestReview();
action.run();
//# sourceMappingURL=RequestReview.js.map