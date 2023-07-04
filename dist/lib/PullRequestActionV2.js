"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PullRequestActionV2 = void 0;
const GraphQLAction_1 = require("./GraphQLAction");
/**
 * 1. change assignees
 *  1.1. column_id is known
 *  1.2. write mutation call
 *    params: issueId, user_id to remove, user_id to add
 *    1.2.1: get issueId
 *      retrieve issueId from:
 *        - payload.repository.name
 *        - payload.repository.owner
 *        - issues(payload.pr.body)
 *      retrieve project Id from "get column_ids" call
 *      retrieve all issues for a project using "get issues" call
 *      having retrieved the issue number, use it to retrieve the issue id
 *    1.2.2: get old_user_id -
 *    1.2.3: get new user_id -
 * 2. change column:
 *  - projectId
 *  - id of column field in project
 *  - id of column
 *  - id of projectItem linked to the issue
 */
class PullRequestActionV2 extends GraphQLAction_1.GraphQLAction {
    async execute() {
        const column_id = this.getInput('column-id');
        const projectNumber = this.getInputNumber('project-number');
        this.log(`retrieved col number ${column_id}`);
        //const project = ProjectContent.fromColumn(this, column_id);
        let isProcessPR = true;
        const pr = this.payload.pull_request;
        const repo = this.payload.repository;
        const fixedIssues = this.fixedIssues(pr);
        for (const fixedIssue of fixedIssues) {
            let linkedIssue = await this.getIssueV2(repo.name, repo.owner.login, fixedIssue, projectNumber);
            if (linkedIssue) {
                isProcessPR = false;
                await this.processIssue(column_id, linkedIssue);
            }
        }
        /*  if (isProcessPR) {
           const fullPR = await this.getPullRequest(pr.number);
           if (fullPR) {
             await this.processIssue(column_id, fullPR);
           }
         } */
    }
    async getIssueV2(repositoryName, repositoryOwner, issueNumber, projectNumber) {
        const query = {
            query: `
      query ($repoName: String!, $owner: String!, $issueNumber: Int! ) {
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
                node {
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
        const data = await this.sendGraphQL(query);
        this.log('received response from getIssueV2');
        this.logSerialized(data);
        const issue = data.repository.issue;
        //const { data: { repository: issue } } = await this.sendGraphQL(query);
        this.log(`retrieved issue`);
        this.logSerialized(issue);
        const projectItem = findProjectItem(issue, projectNumber);
        // remove extra layers
        issue.assignees = issue.assignees.edges.map(edge => edge.node);
        issue.projectItemId = projectItem.id;
        issue.project = issue.projectItem.project;
        delete issue.projectItems;
        return issue;
        function findProjectItem(issue, projectNumber) {
            const projectItem = issue.projectItems.nodes.find(projectItem => projectItem.project.number === projectNumber);
            if (!projectItem) {
                throw new Error(`Project item not found for issue ${issue.title} and project #${projectNumber}`);
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