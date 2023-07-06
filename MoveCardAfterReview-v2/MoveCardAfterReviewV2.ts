import { IssueOrPR } from '../lib/GraphQLAction';
import { PullRequestActionV2 } from '../lib/PullRequestActionV2';


class MoveCardAfterReviewV2 extends PullRequestActionV2 {
  protected async processReassignment(issueOrPR: IssueOrPR): Promise<void> {
    const login = this.payload.requested_reviewer.login;
    const newUserId = await this.getUserId(login);
    const oldUserIds = issueOrPR.assignees.map(assignee => assignee.id);
    await this.reassignIssueV2(issueOrPR, newUserId, oldUserIds); // Also for closed issues
  }
}

const action = new MoveCardAfterReviewV2();
action.run();
