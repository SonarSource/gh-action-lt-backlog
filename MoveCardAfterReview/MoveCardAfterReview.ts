import { IssueOrPR } from '../lib/IssueOrPR';
import { PullRequestAction } from '../lib/PullRequestAction';

class MoveCardAfterReview extends PullRequestAction {
  protected async processReassignment(issueOrPR: IssueOrPR): Promise<void> {
    await this.reassignIssue(issueOrPR, this.payload.pull_request.user.login); // Also for closed issues
  }
}

const action = new MoveCardAfterReview();
action.run();
