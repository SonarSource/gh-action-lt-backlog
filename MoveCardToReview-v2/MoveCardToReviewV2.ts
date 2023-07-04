import { Issue, PullRequestActionV2 } from '../lib/PullRequestActionV2';

/**
 * 1. move card
 *  1. column_id is known
 *  2. write mutation call
 *    params: issueId, user_id to remove, user_id to add
 * 2. change assignees
 *   1. remove assignee
 *   2. set assignee
 */

class MoveCardToReviewV2 extends PullRequestActionV2 {
  protected async processReassignment(issueOrPR: Issue, columnId: string): Promise<void> {
    this.log(`processing reassignment for ${JSON.stringify(issueOrPR, null, 2)}`);
    if (issueOrPR.state.toLocaleLowerCase() === 'open') {
      const login = this.payload.requested_reviewer.login;
      const newUserId = await this.getUserId(login);
      if (login) {
        await this.reassignIssueV2(issueOrPR, newUserId, (issueOrPR as any).assignees.map(assignee => assignee.id));
      } else {  // Review requested from a group - keep it unassigned to raise a suspicion about the card
        await this.removeAssignees(issueOrPR);
      }
      this.changeColumn({
        projectNumber: issueOrPR.project.number,
        projectItemId: issueOrPR.projectItemId,
        columnId,
        projectId: issueOrPR.project.id,
        columnFieldId: issueOrPR.project.columnFieldId,
      });
    }
  }

  protected async reassignIssueV2(issueOrPr, newUserId: string, oldUserIds: string[]) {
    this.log(`reassigning assignees: ${JSON.stringify({
      newUserId,
      oldUserIds,
      issueId: issueOrPr.id,
    }, null, 2)}`);
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
    const response = await this.sendGraphQL(query);
    this.logSerialized(response);
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
    const { user: { id } } = await this.sendGraphQL(query);
    return id;
  }

  protected async removeAssignees(issue: any): Promise<void> {

  }

  protected async changeColumn(params: {
    projectId: string,
    projectNumber: number,
    projectItemId: string,
    columnId: string,
    columnFieldId: string,
  }) {

    const query = {
      projectId: params.projectId,
      projectItemId: params.projectItemId,
      columnFieldId: params.columnFieldId,
      columnId: params.columnId,
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
      `
    };
    const response = await this.sendGraphQL(query);
    this.log('change column response');
    this.logSerialized(response);
  }
}

const action = new MoveCardToReviewV2();
action.run();



