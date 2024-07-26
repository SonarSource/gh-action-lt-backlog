import { PullRequestAction } from '../lib/PullRequestAction';

class PullRequestClosed extends PullRequestAction {
  protected async processJiraIssue(issueId: string): Promise<void> {
    this.moveIssue(issueId, this.isFinalBranch(this.payload.pull_request.base.ref) ? "Merge into master" : "Merge into branch");
  }

  private isFinalBranch(ref: string): boolean {
    return ref === 'master' || ref === 'main' || ref.startsWith('branch-');
  }
}

const action = new PullRequestClosed();
action.run();
