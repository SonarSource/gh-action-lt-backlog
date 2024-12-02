import { PullRequestAction } from '../lib/PullRequestAction';

class RequestReview extends PullRequestAction {
  protected async processJiraIssue(issueId: string): Promise<void> {
    await this.jira.moveIssue(issueId, 'Request Review');
    if (this.payload.requested_reviewer) {  // When team is requested for a review, it has this.payload.requested_team
      const userEmail = await this.findEmail(this.payload.requested_reviewer.login);
      if (userEmail != null) {
        await this.jira.assignIssue(issueId, userEmail);
      }
    }
  }
}

const action = new RequestReview();
action.run();
