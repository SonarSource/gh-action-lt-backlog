import { IssueOrPR, PullRequestActionV2 } from '../lib/PullRequestActionV2';

class MoveCardAfterReviewV2 extends PullRequestActionV2 {
  protected async processReassignment(issueOrPR: IssueOrPR): Promise<void> {
    await this.reassignIssue(issueOrPR, this.payload.pull_request.user.login); // Also for closed issues
  }
}

const action = new MoveCardAfterReviewV2();
action.run();
