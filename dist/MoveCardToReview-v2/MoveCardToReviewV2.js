"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ProjectV2Content_1 = require("../lib/ProjectV2Content");
const PullRequestActionV2_1 = require("../lib/PullRequestActionV2");
class MoveCardToReviewV2 extends PullRequestActionV2_1.PullRequestActionV2 {
    async processReassignment(issueOrPR) {
        if (issueOrPR.state.toLocaleLowerCase() === 'open') {
            const login = this.payload.requested_reviewer.login;
            const newUserId = await (0, ProjectV2Content_1.getUserId)(login);
            const oldUserIds = issueOrPR.assignees.map(assignee => assignee.id);
            if (login) {
                await (0, ProjectV2Content_1.reassignIssueV2)(issueOrPR, newUserId, oldUserIds);
            }
            else {
                // Review requested from a group - keep it unassigned to raise a suspicion about the card
                await (0, ProjectV2Content_1.removeAssigneesV2)(issueOrPR, oldUserIds);
            }
        }
    }
}
const action = new MoveCardToReviewV2();
action.run();
//# sourceMappingURL=MoveCardToReviewV2.js.map