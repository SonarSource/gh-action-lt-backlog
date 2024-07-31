import { PullRequestAction } from '../lib/PullRequestAction';

class PullRequestClosed extends PullRequestAction {
  protected async processJiraIssue(issueId: string): Promise<void> {
    this.jira.moveIssue(issueId, this.isReleaseBranch(this.payload.pull_request.base.ref) ? 'Merge into master' : 'Merge into branch');
  }

  private isReleaseBranch(ref: string): boolean {
    return ref === 'master' || ref === 'main' || ref.startsWith('branch-');
  }
}

const action = new PullRequestClosed();
action.run();
