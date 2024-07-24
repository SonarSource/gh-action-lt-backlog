import { PullRequestAction } from '../lib/PullRequestAction';


class SubmitReview extends PullRequestAction {
  
  protected async processJiraIssue(issueId: string): Promise<void> {
    await this.moveIssue(issueId, this.payload.review.state === 'changes_requested' ? 'Request Changes' : 'Approve');
  }
}

const action = new SubmitReview();
action.run();
