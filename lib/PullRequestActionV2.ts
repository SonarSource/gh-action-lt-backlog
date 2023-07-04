import { OctokitAction } from './OctokitAction';
import { ProjectContent } from './ProjectContent';
import { IssueOrPR } from './IssueOrPR';
import { GraphQLAction } from './GraphQLAction';
import { error } from 'console';

export type Issue = {
  title: string;
  createdAt: string;
  id: string;
  state: string;
  number: number;
  url: string;
  assignees: [{
    id: string;
    login: string
  }];
  projectItemId: string;
  project: {
    id: string;
    number: number;
    columnFieldId: string;
    columns: {
      id: string;
      name: string
    }[]
  };
}

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
export abstract class PullRequestActionV2 extends GraphQLAction {

  protected abstract processReassignment(issueOrPR: Issue, columnId: string): Promise<void>;

  protected async execute(): Promise<void> {
    const columnId = this.getInput('column-id');
    this.log(`retrieved col number ${columnId}`);
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

  async getIssueV2(repositoryName: string, repositoryOwner: string, issueNumber: number, columnId: string): Promise<Issue> {
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
    const data = await this.sendGraphQL(query);
    this.log('received response from getIssueV2');
    this.logSerialized(data);
    const issue = data.repository.issue;
    //const { data: { repository: issue } } = await this.sendGraphQL(query);
    this.log(`retrieved issue`)
    this.logSerialized(issue);

    const projectItem = findProjectItem(issue, columnId);
    // remove extra layers
    issue.assignees = issue.assignees.edges.map(edge => edge.user);
    issue.projectItemId = projectItem.id;
    issue.project = projectItem.project;
    issue.project = Object.assign(issue.project, issue.project.props);
    delete issue.projectItems;

    return issue;

    function findProjectItem(issue: any, columnId: string) {
      const projectItem = issue.projectItems.nodes.find(projectItem => projectItem.project.props.columns.some(column => column.id === columnId));
      if (!projectItem) {
        throw new Error(`Project item not found for issue "${issue.title}" and columnId "${columnId}"`);
      }
      return projectItem;
    }
  }

  protected async processIssue(
    columnId: string,
    issueOrPR: Issue,
  ): Promise<void> {
    await this.processReassignment(issueOrPR, columnId);
    if (issueOrPR.state === 'open') {
      //await project.moveOrCreateCard(issueOrPR, column_id);
    }
  }
}
