import { PullRequestAction } from '../lib/PullRequestAction';

class RequestReview extends PullRequestAction {
  protected async processJiraIssue(issueId: string): Promise<void> {
    await this.processRequestReview(issueId, this.payload.requested_reviewer); // When team is requested for a review, it has this.payload.requested_team
  }
}

const action = new RequestReview();
action.run();
