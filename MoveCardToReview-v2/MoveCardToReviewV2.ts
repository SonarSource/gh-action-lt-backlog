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
    projectNumber: number,
    projectItemId: string,
    columnId: string
  }) {
    const {
      projectId,
      columnFieldId,
    } = await this.getColumnData({
      projectNumber: params.projectNumber,
      columnId: params.columnId,
    });

    const query = {
      projectId,
      projectItemId: params.projectItemId,
      columnFieldId,
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

  /**
   * Based on the project number, returns the project data:
   * {
   *    projectId,
   *    columnFieldId,
   *    columnId,
   * }
   *
   * Inspired from # https://docs.github.com/en/issues/planning-and-tracking-with-projects/automating-your-project/automating-projects-using-actions
   *
   * @param params
   */
  protected async getColumnData(params: { projectNumber: number, columnName?: string, columnId: string }) {
    const query = {
      projectNumber: params.projectNumber,
      query: `
  query ($projectNumber: Int!){
    user(login: "ilia-kebets-sonarsource") {
      projectV2(number: $projectNumber) {
        projectId: id
        field(name: "Status") {
          ... on ProjectV2SingleSelectField {
            columnFieldId: id
            columns: options {
              columnId: id
              name
            }
          }
        }
      }
    }
  }
        `,
    };
    const response = await this.sendGraphQL(query);
    this.log('got project data');
    this.logSerialized(response);
    const { data: { user: { projectV2: { projectId, field: { columnFieldId, columns } } } } } = response;
    const result = {
      projectId,
      columnFieldId,
      columnId: params.columnId
    }
    if (!result.columnId) {
      result.columnId = retrieveColumnId(columns, params.columnName);
    }
    return result;

    type ColumnData = {
      columnId: string,
      name: string,
    }

    function retrieveColumnId(columns: ColumnData[], columnName: string) {
      const column = columns.find(col => columnName === col.name);
      if (!column) {
        throw new Error(`column with name ${columnName} not found in project #${params.projectNumber}`);
      }
      return column.columnId;
    }
  }
}

const action = new MoveCardToReviewV2();
action.run();



