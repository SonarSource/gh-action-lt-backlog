import { OctokitAction } from './OctokitAction';

export abstract class PullRequestAction extends OctokitAction {
  protected abstract processJiraIssue(issueId: string): Promise<void>;

  protected async execute(): Promise<void> {
    const issueIds = await this.fixedJiraIssues();

    if (issueIds.length === 0) {
      console.warn('No Jira issue found in the PR title.');
    }

    for (const issueId of issueIds) {
      await this.processJiraIssue(issueId);
    }
  }

  private async fixedJiraIssues(): Promise<string[]> {
    let pullRequest = await this.getPullRequest(this.payload.pull_request.number);

    if (pullRequest == null) {
      console.log('Pull request not found.');
    }

    return pullRequest?.title.match(/[A-Z]+-\d+/g) || [];
  }
}
