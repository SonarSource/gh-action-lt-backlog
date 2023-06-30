import { OctokitAction } from './OctokitAction';
import { ProjectContent } from './ProjectContent';
import { IssueOrPR } from './IssueOrPR';
import { GraphQLAction } from './GraphQLAction';

/**
 * 1. move card
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
 * 2. change assignees
 *   1. remove assignee
 *   2. set assignee
 */
export abstract class PullRequestActionV2 extends GraphQLAction {

  protected abstract processReassignment(issueOrPR: IssueOrPR): Promise<void>;

  protected async execute(): Promise<void> {
    const column_id = this.getInputNumber('column-id');
    //const project = ProjectContent.fromColumn(this, column_id);

    let isProcessPR = true;
    const pr = this.payload.pull_request;
    const repo = this.payload.repository;
    const fixedIssues = this.fixedIssues(pr);
    for (const fixedIssue of fixedIssues) {
      let linkedIssue = await this.getIssueV2(repo.name, repo.owner.login, fixedIssue);
      if (linkedIssue) {
        isProcessPR = false;
        await this.processIssue(column_id, linkedIssue);
      }
    }
    if (isProcessPR) {
      const fullPR = await this.getPullRequest(pr.number);
      if (fullPR) {
        await this.processIssue(column_id, fullPR);
      }
    }
  }

  async getIssueV2(repositoryName: string, repositoryOwner: string, issueNumber: number) {
    const query = {
      query: `
        query ($repoName: String!, $owner: String!, $issueNumber: Int! ) {
          repository(name: $repoName, owner: $owner) {
            issue: issue(number: $issueNumber) {
              title
              createdAt
              id
              state
              assignees(first: 10) {
                edges {
                  node {
                    id
                    login
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
    const { data: { repository: issue } } = await this.sendGraphQL(query);
    this.log(`retrieved issue`)
    this.logSerialized(issue);
    return issue;
  }

  protected async processIssue(
    column_id: number,
    issueOrPR: IssueOrPR,
  ): Promise<void> {
    await this.processReassignment(issueOrPR);
    if (issueOrPR.state === 'open') {
      //await project.moveOrCreateCard(issueOrPR, column_id);
    }
  }
}
