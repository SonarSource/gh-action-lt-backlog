import { PullRequestAction } from '../lib/PullRequestAction';


class SubmitReview extends PullRequestAction {
  
  protected async processJiraIssue(issueId: string): Promise<void> {
    await this.moveIssue(issueId, "Request Changes");
  }
}

const action = new SubmitReview();
action.run();
