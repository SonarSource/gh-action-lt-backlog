import { OctokitAction } from './OctokitAction';
import { ColumnId, ProjectContent, ProjectContentV1, ProjectContentV2 } from './ProjectContent';
import { IssueOrPR } from './IssueOrPR';

export abstract class PullRequestAction extends OctokitAction {
  protected abstract processReassignment(issueOrPR: IssueOrPR): Promise<void>;

  protected async execute(): Promise<void> {
    let column_id: ColumnId = this.getInput('column-id');
    const projectNumber = this.getInput('project-number');
    let project: Promise<ProjectContent>;
    if (projectNumber) {
      project = ProjectContentV2.fromProject(this, parseInt(projectNumber))
    } else {
      column_id = parseInt(column_id);
      project = ProjectContentV1.fromColumn(this, column_id);
    }

    let processPR = true;
    const pr = this.payload.pull_request;
    const fixedIssues = this.fixedIssues(pr);
    for (const fixedIssue of fixedIssues) {
      let linkedIssue = await this.getIssue(fixedIssue);
      if (linkedIssue) {
        processPR = false;
        await this.processIssue(project, column_id, linkedIssue);
      }
    }
    if (processPR) {
      const fullPR = await this.getPullRequest(pr.number);
      if (fullPR) {
        await this.processIssue(project, column_id, fullPR);
      }
    }
  }

  protected async processIssue(
    projectPromise: Promise<ProjectContent>,
    column_id: ColumnId,
    issueOrPR: IssueOrPR,
  ): Promise<void> {
    await this.processReassignment(issueOrPR);
    if (issueOrPR.state === 'open') {
      const project = await projectPromise;
      await project.moveOrCreateCard(issueOrPR, column_id);
    }
  }
}
