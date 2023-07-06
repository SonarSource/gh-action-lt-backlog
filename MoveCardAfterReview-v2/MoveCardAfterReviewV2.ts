import { IssueOrPR } from '../lib/GraphQLAction';
import { PullRequestActionV2 } from '../lib/PullRequestActionV2';


class MoveCardAfterReviewV2 extends PullRequestActionV2 {
  protected async processReassignment(issueOrPR: IssueOrPR): Promise<void> {
    const oldUserIds = issueOrPR.assignees.map(assignee => assignee.id);
    await this.reassignIssueV2(issueOrPR, this.payload.pull_request.user.login, oldUserIds); // Also for closed issues
  }
}

const action = new MoveCardAfterReviewV2();
action.run();
