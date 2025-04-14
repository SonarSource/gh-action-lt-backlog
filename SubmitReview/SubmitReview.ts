import { PullRequestAction } from '../lib/PullRequestAction';

class SubmitReview extends PullRequestAction {

  protected async processJiraIssue(issueId: string): Promise<void> {
    if (this.payload.review.state === 'approved') {
      if (this.getInputBoolean('is-infra')) {
        const userEmail = await this.findEmail(this.payload.sender.login);
        if (userEmail) {
          await this.jira.addReviewedBy(issueId, userEmail);
        }
      } else {
        await this.jira.moveIssue(issueId, 'Approve');
      }
    } else if (this.payload.review.state === 'changes_requested') {
      await this.jira.moveIssue(issueId, 'Request Changes');
    }
  }
}

const action = new SubmitReview();
action.run();
