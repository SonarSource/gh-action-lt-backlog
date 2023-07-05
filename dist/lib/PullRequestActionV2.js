"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PullRequestActionV2 = void 0;
const GraphQLAction_1 = require("./GraphQLAction");
class PullRequestActionV2 extends GraphQLAction_1.GraphQLAction {
    async execute() {
        const columnId = this.getInput('column-id');
        //const project = ProjectContent.fromColumn(this, column_id);
        let isProcessPR = true;
        const pr = this.payload.pull_request;
        const repo = this.payload.repository;
        const fixedIssues = this.fixedIssues(pr);
        for (const fixedIssue of fixedIssues) {
            let linkedIssue = await this.getIssueOrPrV2(repo.name, repo.owner.login, fixedIssue, columnId);
            if (linkedIssue) {
                isProcessPR = false;
                await this.processIssue(columnId, linkedIssue);
            }
        }
        if (isProcessPR) {
            const fullPR = await this.getIssueOrPrV2(repo.name, repo.owner.login, pr.number, columnId, false);
            if (fullPR) {
                await this.processIssue(columnId, fullPR);
            }
        }
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
    async getIssueOrPrV2(repositoryName, repositoryOwner, itemNumber, columnId, isIssue = true) {
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
        issueOrPr.projectItemId = projectItem.id;
        issueOrPr.project = projectItem.project;
        // remove extra layers
        issueOrPr.project = Object.assign(issueOrPr.project, issueOrPr.project.props);
        issueOrPr.assignees = issueOrPr.assignees.edges.map(edge => edge.user);
        delete issueOrPr.projectItems;
        return issueOrPr;
        /**
         * Find the project item whose project contains the columnId we want to move it in
         *
         * @param issue
         * @param columnId
         * @returns
         */
        function findProjectItem(issue, columnId) {
            const projectItem = issue.projectItems.nodes.find(projectItem => projectItem.project.props.columns.some(column => column.id === columnId));
            if (!projectItem) {
                throw new Error(`Project item not found for issue "${issue.title}" and columnId "${columnId}"`);
            }
            return projectItem;
        }
    }
    async processIssue(columnId, issueOrPR) {
        await this.processReassignment(issueOrPR);
        if (issueOrPR.state === 'open') {
            await this.changeColumn(issueOrPR.project.id, issueOrPR.projectItemId, columnId, issueOrPR.project.columnFieldId);
        }
    }
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
exports.PullRequestActionV2 = PullRequestActionV2;
//# sourceMappingURL=PullRequestActionV2.js.map