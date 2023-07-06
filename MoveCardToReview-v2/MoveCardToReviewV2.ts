import { IssueOrPR } from '../lib/GraphQLAction';
import { PullRequestActionV2 } from '../lib/PullRequestActionV2';

class MoveCardToReviewV2 extends PullRequestActionV2 {
  protected async processReassignment(issueOrPR: IssueOrPR): Promise<void> {
    if (issueOrPR.state.toLocaleLowerCase() === 'open') {
      const login = this.payload.requested_reviewer.login;
      const newUserId = await this.getUserId(login);
      const oldUserIds = issueOrPR.assignees.map(assignee => assignee.id);
      if (login) {
        await this.reassignIssueV2(issueOrPR, newUserId, oldUserIds);
      } else {
        // Review requested from a group - keep it unassigned to raise a suspicion about the card
        await this.removeAssigneesV2(issueOrPR, oldUserIds);
      }
    }
  }
}

const action = new MoveCardToReviewV2();
action.run();
