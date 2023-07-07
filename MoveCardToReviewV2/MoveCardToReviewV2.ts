import { IssueOrPR } from '../lib/GraphQLAction';
import { PullRequestActionV2 } from '../lib/PullRequestActionV2';

class MoveCardToReviewV2 extends PullRequestActionV2 {
  protected async processReassignment(issueOrPR: IssueOrPR): Promise<void> {
    if (issueOrPR.state.toLocaleLowerCase() === 'open') {
      const login = this.payload.requested_reviewer.login;
      const userIdToAdd = await this.getUserId(login);
      const userIdsToRemove = issueOrPR.assignees.map(assignee => assignee.id);
      if (login) {
        await this.reassignIssueV2(issueOrPR, userIdToAdd, userIdsToRemove);
      } else {
        // Review requested from a group - keep it unassigned to raise a suspicion about the card
        await this.removeAssigneesV2(issueOrPR, userIdsToRemove);
      }
    }
  }
}

const action = new MoveCardToReviewV2();
action.run();
