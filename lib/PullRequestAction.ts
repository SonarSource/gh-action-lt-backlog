import { JIRA_ISSUE_PATTERN } from './Constants';
import { OctokitAction } from './OctokitAction';

export abstract class PullRequestAction extends OctokitAction {
  protected abstract processJiraIssue(issueId: string): Promise<void>;

  protected async execute(): Promise<void> {
    const issueIds = await this.fixedJiraIssues();
    if (issueIds.length === 0) {
      console.warn('No Jira issue found in the PR title.');
    } else {
      for (const issueId of issueIds) {
        if ((issueId.startsWith('BUILD-') || issueId.startsWith('PREQ-')) && !this.getInputBoolean('is-infra')) {
          this.log(`Skipping ${issueId}`);
        }
        else {
          await this.processJiraIssue(issueId);
        }
      }
    }
  }

  private async fixedJiraIssues(): Promise<string[]> {
    const pr = await this.getPullRequest(this.payload.pull_request.number);
    return pr?.title.match(JIRA_ISSUE_PATTERN) || [];
  }
}
