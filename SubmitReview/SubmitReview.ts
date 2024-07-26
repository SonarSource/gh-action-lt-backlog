import { PullRequestAction } from '../lib/PullRequestAction';


class SubmitReview extends PullRequestAction {
  
  protected async processJiraIssue(issueId: string): Promise<void> {
    if (this.payload.review.state === 'approved') {
      await this.moveIssue(issueId, 'Approve');
    } else if (this.payload.review.state === 'changes_requested') {
      await this.moveIssue(issueId, 'Request Changes');
    }
  }
}

const action = new SubmitReview();
action.run();
