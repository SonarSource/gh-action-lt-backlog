import { OctokitAction } from './OctokitAction';
import { graphql, GraphQlQueryResponseData } from '@octokit/graphql';
import * as graphqlTypes from '@octokit/graphql/dist-types/types';

export type IssueOrPR = {
  title: string;
  createdAt: string;
  id: string;
  state: string;
  number: number;
  url: string;
  assignees: [
    {
      id: string;
      login: string;
    },
  ];
  projectItemId?: string;
  project?: ProjectV2
};

export type ProjectV2 = {
  id: string;
  number: number;
  columnFieldId: string;
  columns: {
    id: string;
    name: string;
  }[];
};

export abstract class GraphQLAction extends OctokitAction {
  private readonly graphqlWithAuth: graphqlTypes.graphql;

  constructor() {
    super();
    this.graphqlWithAuth = graphql.defaults({
      headers: {
        authorization: `token ${this.getInput('github-token')}`,
      },
    });
  }

  sendGraphQL(query: string | any): Promise<GraphQlQueryResponseData> {
    return this.graphqlWithAuth(query);
  }

  /**
 * Retrieves the Issue or Pull Request and all its data as defined by its type
 *
 * @param repositoryName eg.: SonarJS
 * @param repositoryOwner eg.: SonarSource
 * @param itemNumber the issue or PR number, available in the URL like: https://github.com/SonarSource/SonarJS/pull/3
 * @param columnId
 * @param isIssue fetches issue if true, otherwise pull request
 * @returns
 */
  async getIssueOrPrV2(
    repositoryName: string,
    repositoryOwner: string,
    itemNumber: number,
    columnId: string,
    isIssue: boolean = true,
  ): Promise<IssueOrPR> {
    const item = isIssue ? 'issue' : 'pullRequest';
    const query = {
      query: `
    query ($repositoryName: String!, $repositoryOwner: String!, $itemNumber: Int!) {
      repository(name: $repositoryName, owner: $repositoryOwner) {
        ${item}(number: $itemNumber) {
          title
          createdAt
          id
          state
          number
          url
          assignees(first: 10) {
            edges {
              user: node {
                id
                login
              }
            }
          }
          # We don't expect an issue to be part of more than 20 projects
          projectItems(last: 20) {
            nodes {
              id
              type
              project {
                id
                number
                props: field(name: "Status") {
                  ... on ProjectV2SingleSelectField {
                    columnFieldId: id
                    columns: options {
                      id
                      name
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
    `,
      repositoryName,
      repositoryOwner,
      itemNumber,
    };
    const { repository } = await this.sendGraphQL(query);
    const issueOrPr = repository[item];

    const projectItem = findProjectItem(issueOrPr, columnId);
    if (projectItem) {
      issueOrPr.projectItemId = projectItem.id;
      issueOrPr.project = projectItem.project;
      // remove extra layers
      issueOrPr.project = Object.assign(issueOrPr.project, issueOrPr.project.props);
    }

    // remove extra layers
    issueOrPr.assignees = issueOrPr.assignees.edges.map(edge => edge.user);
    delete issueOrPr.projectItems;
    console.log('returnin issueorpr', issueOrPr);
    return issueOrPr;

    /**
     * Find the project item whose project contains the columnId we want to move it in
     *
     * @param issue
     * @param columnId
     * @returns
     */
    function findProjectItem(issue: any, columnId: string) {
      const projectItem = issue.projectItems.nodes.find(projectItem =>
        projectItem.project.props.columns.some(column => column.id === columnId),
      );
      if (!projectItem) {
        console.log(
          `Project item not found for issue "${issue.title}" and columnId "${columnId}"`,
        );
      }
      return projectItem;
    }
  }

  /**
   * If the card is already part of the porject, simply moves it to columnId
   * Otherwise,
   *  - fetches project data
   *  - creates a project card for the PR
   *  - moves the card to columnId
   *
   * @param issueOrPR
   * @param columnId
   * @param repoOwner
   * @param projectNumber
   * @param isOrg
   */
  async moveOrCreateCardV2(issueOrPR: IssueOrPR, columnId: string, repoOwner: string, projectNumber: number, isOrg: boolean): Promise<void> {
    if (!issueOrPR.project) {

      issueOrPR.project = await this.getProjectDataV2(repoOwner, projectNumber, isOrg);
      issueOrPR.projectItemId = await this.createCardV2(issueOrPR, issueOrPR.project.id);
    }
    await this.changeColumn(
      issueOrPR.project.id,
      issueOrPR.projectItemId,
      columnId,
      issueOrPR.project.columnFieldId,
    );
  }

  /**
   * Creates a card for the project
   *
   * @param issueOrPr
   * @param projectId
   * @returns the projectItemId
   */
  async createCardV2(issueOrPr: IssueOrPR, projectId: string): Promise<string> {

    const query = {
      pullRequestId: issueOrPr.id,
      projectId,
      query: `
      mutation($pullRequestId: ID! $projectId: ID!) {
        addProjectV2ItemById(input: { contentId: $pullRequestId, projectId: $projectId }) {
          item {
            id
            content {
              ... on PullRequest {
                title
              }
            }
          }
        }
      }
      `
    };
    const response = await this.sendGraphQL(query);
    return response.addProjectV2ItemById.item.id;
  }

  /**
   * Retrieve project data
   *
   * @param owner
   * @param projectNumber
   * @param isOrg
   * @returns
   */
  async getProjectDataV2(owner: string, projectNumber: number, isOrg: boolean) {
    const ownerType = isOrg ? 'organization' : 'user';
    const query = {
      owner,
      projectNumber,
      query: `
    query ($owner: String!, $projectNumber: Int!) {
      ${ownerType}(login: $owner) {
        projectV2(number: $projectNumber) {
          id
          field(name: "Status") {
            ... on ProjectV2SingleSelectField {
              columnFieldId: id
              columns: options {
                id
                name
              }
            }
          }
        }
      }
    }

    `,
    };
    console.log('fetchin project wid', query.query);
    const response = await this.sendGraphQL(query);
    const project = response[ownerType].projectV2;
    return {
      id: project.id,
      columnFieldId: project.field.columnFieldId,
      columns: project.columns,
      number: projectNumber,
    };
  }

  /**
   * Changes column for a projectV2 item
   * inspired from # https://docs.github.com/en/issues/planning-and-tracking-with-projects/automating-your-project/automating-projects-using-actions
   *
   * @param projectId
   * @param projectItemId
   * @param columnId
   * @param columnFieldId
   */
  async changeColumn(
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
        updateProjectV2ItemFieldValue(input: {
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

  async removeAssigneesV2(issueOrPr: IssueOrPR, oldUserIds: string[]): Promise<void> {
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

  async getUserId(login: string) {
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

  /**
    * Reassign issue from oldUserIds to newUserId
    *
    * @param issueOrPr
    * @param newUserId
    * @param oldUserIds
    */
  async reassignIssueV2(issueOrPr: IssueOrPR, newUserId: string, oldUserIds: string[]) {
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
}
