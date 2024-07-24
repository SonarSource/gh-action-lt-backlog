import { OctokitAction } from './OctokitAction';

export abstract class PullRequestAction extends OctokitAction {
  protected abstract processJiraIssue(issueId: string): Promise<void>;

  protected async execute(): Promise<void> {
    const issueIds = await this.fixedJiraIssues();

    if (issueIds.length === 0) {
      console.warn('No Jira issue found in the PR title.');
    } else {
      for (const issueId of issueIds) {
        await this.processJiraIssue(issueId);
      }
    }
  }

  private async fixedJiraIssues(): Promise<string[]> {
    const pr = await this.getPullRequest(this.payload.pull_request.number);

    if (pr == null) {
      console.log('Pull request not found.');
      return [];
    }

    return pr.title.match(/[A-Z]+-\d+/g) || [];
  }
}
