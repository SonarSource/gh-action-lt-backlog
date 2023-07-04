import { Issue, PullRequestActionV2 } from '../lib/PullRequestActionV2';

class MoveCardToReviewV2 extends PullRequestActionV2 {
  protected async processReassignment(issueOrPR: Issue, columnId: string): Promise<void> {
    if (issueOrPR.state.toLocaleLowerCase() === 'open') {
      const login = this.payload.requested_reviewer.login;
      const newUserId = await this.getUserId(login);
      if (login) {
        await this.reassignIssueV2(
          issueOrPR,
          newUserId,
          issueOrPR.assignees.map(assignee => assignee.id),
        );
      } else {
        // Review requested from a group - keep it unassigned to raise a suspicion about the card
        await this.removeAssignees(issueOrPR);
      }
      this.changeColumn(
        issueOrPR.project.id,
        issueOrPR.projectItemId,
        columnId,
        issueOrPR.project.columnFieldId,
      );
    }
  }

  /**
   * Reassign issue from oldUserIds to newUserId
   *
   * @param issueOrPr
   * @param newUserId
   * @param oldUserIds
   */
  protected async reassignIssueV2(issueOrPr: Issue, newUserId: string, oldUserIds: string[]) {
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

  protected async getUserId(login: string) {
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
    const {
      user: { id },
    } = await this.sendGraphQL(query);
    return id;
  }

  protected async removeAssignees(issue: any): Promise<void> {}

  /**
   * Changes column for a projectV2 item
   *
   * @param projectId
   * @param projectItemId
   * @param columnId
   * @param columnFieldId
   */
  protected async changeColumn(
    projectId: string,
    projectItemId: string,
    columnId: string,
    columnFieldId: string,
  ) {
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
