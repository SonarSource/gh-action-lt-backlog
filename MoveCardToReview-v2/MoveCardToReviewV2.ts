import { PullRequestActionV2 } from '../lib/PullRequestActionV2';
import { IssueOrPR } from '../lib/IssueOrPR';

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
  protected async processReassignment(issueOrPR: IssueOrPR): Promise<void> {
    this.log(`processing reassignment for ${JSON.stringify(issueOrPR, null, 2)}`);
    if (issueOrPR.state.toLocaleLowerCase() === 'open') {
      const login = this.payload.requested_reviewer.login;
      const newUserId = await this.getUserId(login);
      if (login) {
        await this.reassignIssueV2(issueOrPR, newUserId, (issueOrPR as any).assignees.edges[0].node.id);
      } else {  // Review requested from a group - keep it unassigned to raise a suspicion about the card
        await this.removeAssignees(issueOrPR);
      }
    }
  }

  protected async reassignIssueV2(issueOrPr, loginToAdd: string, loginToRemove: string) {
    this.log(`reassigning assignees: ${JSON.stringify({
      newUserId: loginToAdd,
      oldUserId: loginToRemove,
      issueId: issueOrPr.id,
    }, null, 2)}`);
    const query = {
      query: `
      mutation($newUserId: ID! $oldUserId: ID! $issueId: ID!) {
        removeAssigneesFromAssignable(input: {
          assignableId: $issueId
          assigneeIds: [$oldUserId]
        }) {
          assignable {
            assignees(last: 1) {
              nodes {
                name
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
              }
            }
          }
        }
      }
      `,
      newUserId: loginToAdd,
      oldUserId: loginToRemove,
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
    const { user: { id }} = await this.sendGraphQL(query);
    return id;
  }

  protected async removeAssignees(issue: any): Promise<void> {

  }
}

const action = new MoveCardToReviewV2();
action.run();



