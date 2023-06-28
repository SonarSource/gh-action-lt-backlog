import { PullRequestAction } from '../lib/PullRequestAction';
import { IssueOrPR } from '../lib/IssueOrPR';

class MoveCardToReview extends PullRequestAction {
  protected async processReassignment(issueOrPR: IssueOrPR): Promise<void> {
    if (issueOrPR.state === 'open') {
      const login = this.payload.requested_reviewer.login;
      if (login) {
        await this.reassignIssue(issueOrPR, login);
      } else {  // Review requested from a group - keep it unassigned to raise a suspicion about the card
        await this.removeAssignees(issueOrPR);
      }
    }
  }
}

const action = new MoveCardToReview();
action.run();
