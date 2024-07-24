import { OctokitAction } from './OctokitAction';

export abstract class PullRequestAction extends OctokitAction {
  protected abstract processJiraIssue(issueId: string): Promise<void>;

  protected async execute(): Promise<void> {
    const issueIds = await this.getLinkedJiraIssues();

    if (issueIds.length === 0) {
      console.warn('No JIRA issue found in the PR title.');
    }

    for (const issueId of issueIds) {
      await this.processJiraIssue(issueId);
    }
  }

  private async getLinkedJiraIssues(): Promise<string[]> {
    return ["PAVEL-26"];
    let pullRequest = await this.getPullRequest(this.payload.pull_request.number);

    if (!pullRequest) {
      // This can happen in case GITHUB_TOKEN does not have sufficient permissions
      // More info: https://docs.github.com/en/actions/security-guides/automatic-token-authentication#permissions-for-the-github_token
      throw new Error(`Pull request not found: #${this.payload.pull_request.number}. Please check GITHUB_TOKEN permissions.`);
    }

    return pullRequest.title.match(/[A-Z]+-\d+/g) || [];
  }
}
