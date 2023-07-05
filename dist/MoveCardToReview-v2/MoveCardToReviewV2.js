"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const PullRequestActionV2_1 = require("../lib/PullRequestActionV2");
class MoveCardToReviewV2 extends PullRequestActionV2_1.PullRequestActionV2 {
    async processReassignment(issueOrPR) {
        if (issueOrPR.state.toLocaleLowerCase() === 'open') {
            const login = this.payload.requested_reviewer.login;
            const newUserId = await this.getUserId(login);
            const oldUserIds = issueOrPR.assignees.map(assignee => assignee.id);
            if (login) {
                await this.reassignIssueV2(issueOrPR, newUserId, oldUserIds);
            }
            else {
                // Review requested from a group - keep it unassigned to raise a suspicion about the card
                await this.removeAssigneesV2(issueOrPR, oldUserIds);
            }
        }
    }
    /**
     * Reassign issue from oldUserIds to newUserId
     *
     * @param issueOrPr
     * @param newUserId
     * @param oldUserIds
     */
    async reassignIssueV2(issueOrPr, newUserId, oldUserIds) {
        const query = {
            query: `
      mutation($newUserId: ID! $oldUserIds: [ID!]! $issueOrPrId: ID!) {
        removeAssigneesFromAssignable(input: {
          assignableId: $issueOrPrId
          assigneeIds: $oldUserIds
        }) {
          assignable {
            assignees(last: 1) {
              nodes {
                name
                login
              }
            }
          }
        }
        addAssigneesToAssignable(input: {
          assignableId: $issueOrPrId
          assigneeIds: [$newUserId]
          clientMutationId: "gh action"
        }) {
          assignable {
            assignees(last: 10) {
              nodes {
                name
                login
              }
            }
          }
        }
      }
      `,
            newUserId,
            oldUserIds,
            issueOrPrId: issueOrPr.id,
        };
        await this.sendGraphQL(query);
    }
    async getUserId(login) {
        const query = {
            query: `
      query($username: String!) {
        user(login: $username) {
          id
        }
      }
      `,
            username: login,
        };
        const { user: { id }, } = await this.sendGraphQL(query);
        return id;
    }
    async removeAssigneesV2(issueOrPr, oldUserIds) {
        const query = {
            query: `
      mutation($oldUserIds: [ID!]! $issueOrPrId: ID!) {
        removeAssigneesFromAssignable(input: {
          assignableId: $issueOrPrId
          assigneeIds: $oldUserIds
        }) {
          assignable {
            assignees(last: 1) {
              nodes {
                name
                login
              }
            }
          }
        }
      }
      `,
            oldUserIds,
            issueOrPrId: issueOrPr.id,
        };
        await this.sendGraphQL(query);
    }
}
const action = new MoveCardToReviewV2();
action.run();
//# sourceMappingURL=MoveCardToReviewV2.js.map