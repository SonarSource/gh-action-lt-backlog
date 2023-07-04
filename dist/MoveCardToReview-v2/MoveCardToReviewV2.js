"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const PullRequestActionV2_1 = require("../lib/PullRequestActionV2");
class MoveCardToReviewV2 extends PullRequestActionV2_1.PullRequestActionV2 {
    async processReassignment(issueOrPR, columnId) {
        if (issueOrPR.state.toLocaleLowerCase() === 'open') {
            const login = this.payload.requested_reviewer.login;
            const newUserId = await this.getUserId(login);
            if (login) {
                await this.reassignIssueV2(issueOrPR, newUserId, issueOrPR.assignees.map(assignee => assignee.id));
            }
            else {
                // Review requested from a group - keep it unassigned to raise a suspicion about the card
                await this.removeAssignees(issueOrPR);
            }
            this.changeColumn(issueOrPR.project.id, issueOrPR.projectItemId, columnId, issueOrPR.project.columnFieldId);
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
      mutation($newUserId: ID! $oldUserIds: [ID!]! $issueId: ID!) {
        removeAssigneesFromAssignable(input: {
          assignableId: $issueId
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
          assignableId: $issueId
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
            issueId: issueOrPr.id,
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
    async removeAssignees(issue) { }
    /**
     * Changes column for a projectV2 item
     *
     * @param projectId
     * @param projectItemId
     * @param columnId
     * @param columnFieldId
     */
    async changeColumn(projectId, projectItemId, columnId, columnFieldId) {
        const query = {
            projectId,
            projectItemId,
            columnFieldId,
            columnId,
            query: `
      mutation (
        $projectId: ID!,
        $projectItemId: ID!,
        $columnFieldId: ID!,
        $columnId: String!,
      ) {
        set_status: updateProjectV2ItemFieldValue(input: {
          projectId: $projectId,
          itemId: $projectItemId,
          fieldId: $columnFieldId,
          value: {
            singleSelectOptionId: $columnId
          }
        }) {
          projectV2Item {
            id
          }
        }
      }
      `,
        };
        await this.sendGraphQL(query);
    }
}
const action = new MoveCardToReviewV2();
action.run();
//# sourceMappingURL=MoveCardToReviewV2.js.map