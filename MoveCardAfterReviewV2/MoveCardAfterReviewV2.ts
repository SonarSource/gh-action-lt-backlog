import { IssueOrPR } from '../lib/GraphQLAction';
import { PullRequestActionV2 } from '../lib/PullRequestActionV2';

class MoveCardAfterReviewV2 extends PullRequestActionV2 {
  protected async processReassignment(issueOrPR: IssueOrPR): Promise<void> {
    const login = this.payload.pull_request.user.login;
    const userIdToAdd = await this.getUserId(login);
    const userIdsToRemove = issueOrPR.assignees.map(assignee => assignee.id);
    await this.reassignIssueV2(issueOrPR, userIdToAdd, userIdsToRemove); // Also for closed issues
  }
}

const action = new MoveCardAfterReviewV2();
action.run();