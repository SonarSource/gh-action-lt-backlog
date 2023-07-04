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
            let linkedIssue = await this.getIssueV2(repo.name, repo.owner.login, fixedIssue, columnId);
            if (linkedIssue) {
                isProcessPR = false;
                await this.processIssue(columnId, linkedIssue);
            }
        }
        /*  if (isProcessPR) {
           const fullPR = await this.getPullRequest(pr.number);
           if (fullPR) {
             await this.processIssue(column_id, fullPR);
           }
         } */
    }
    async getIssueV2(repositoryName, repositoryOwner, issueNumber, columnId) {
        const query = {
            query: `
      query ($repoName: String!, $owner: String!, $issueNumber: Int!) {
        repository(name: $repoName, owner: $owner) {
          issue(number: $issueNumber) {
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
            repoName: repositoryName,
            owner: repositoryOwner,
            issueNumber,
        };
        const { repository: issue } = await this.sendGraphQL(query);
        console.log('issue?', issue);
        // remove extra layers
        issue.assignees = issue.assignees.edges.map(edge => edge.user);
        const projectItem = findProjectItem(issue, columnId);
        issue.projectItemId = projectItem.id;
        issue.project = projectItem.project;
        issue.project = Object.assign(issue.project, issue.project.props);
        delete issue.projectItems;
        return issue;
        function findProjectItem(issue, columnId) {
            const projectItem = issue.projectItems.nodes.find(projectItem => projectItem.project.props.columns.some(column => column.id === columnId));
            if (!projectItem) {
                throw new Error(`Project item not found for issue "${issue.title}" and columnId "${columnId}"`);
            }
            return projectItem;
        }
    }
    async processIssue(columnId, issueOrPR) {
        await this.processReassignment(issueOrPR, columnId);
        if (issueOrPR.state === 'open') {
            //await project.moveOrCreateCard(issueOrPR, column_id);
        }
    }
}
exports.PullRequestActionV2 = PullRequestActionV2;
//# sourceMappingURL=PullRequestActionV2.js.map