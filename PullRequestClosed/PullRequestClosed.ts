import { PullRequestAction } from '../lib/PullRequestAction';

class PullRequestClosed extends PullRequestAction {
  protected async processJiraIssue(issueId: string): Promise<void> {
    const transition = await this.jira.findTransition(issueId, this.isReleaseBranch(this.payload.pull_request.base.ref) ? 'Merge into master' : 'Merge into branch');
    if (transition == null) {
      await this.jira.moveIssue(issueId, 'Merge');
    } else {
      await this.jira.transitionIssue(issueId, transition);
    }
  }

  private isReleaseBranch(ref: string): boolean {
    return ref === 'master' || ref === 'main' || ref.startsWith('branch-');
  }
}

const action = new PullRequestClosed();
action.run();
