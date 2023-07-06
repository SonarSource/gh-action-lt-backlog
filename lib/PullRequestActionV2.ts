import { GraphQLAction, IssueOrPR } from './GraphQLAction';

export abstract class PullRequestActionV2 extends GraphQLAction {
  protected abstract processReassignment(issueOrPR: IssueOrPR): Promise<void>;

  protected async execute(): Promise<void> {
    const columnId = this.getInput('column-id');
    const projectNumber = this.getInputNumber('project-number');
    const isOrg = false;

    let isProcessPR = true;
    const pr = this.payload.pull_request;
    const repo = this.payload.repository;
    const fixedIssues = this.fixedIssues(pr);
    for (const fixedIssue of fixedIssues) {
      let linkedIssue = await this.getIssueOrPrV2(
        repo.name,
        repo.owner.login,
        fixedIssue,
        columnId,
      );
      if (linkedIssue) {
        isProcessPR = false;
        await this.processIssue(columnId, linkedIssue, repo.owner.login, projectNumber, isOrg);
      }
    }
    if (isProcessPR) {
      const fullPR = await this.getIssueOrPrV2(
        repo.name,
        repo.owner.login,
        pr.number,
        columnId,
        false,
      );
      if (fullPR) {
        await this.processIssue(columnId, fullPR, repo.owner.login, projectNumber, isOrg);
      }
    }

    /**
     * Defaults to true
     *
     * @returns
     */
    function parseIsOrg() {
      const isOrg = this.getInput('is-org');
      return !isOrg || Boolean(isOrg);
    }
  }

  protected async processIssue(columnId: string, issueOrPR: IssueOrPR, repoOwner: string, projectNumber: number, isOrg: boolean): Promise<void> {
    await this.processReassignment(issueOrPR);
    if (issueOrPR.state.toLocaleLowerCase() === 'open') {
      await this.moveOrCreateCardV2(issueOrPR, columnId, repoOwner, projectNumber, isOrg);
    }
  }
}
