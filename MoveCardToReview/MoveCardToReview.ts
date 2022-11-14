import { PullRequestAction } from "../lib/PullRequestAction";
import { IssueOrPR } from "../lib/IssueOrPR";

class MoveCardToReview extends PullRequestAction {

    protected async processReassignment(issueOrPR: IssueOrPR): Promise<void> {
        if (issueOrPR.state === "open") {
            await this.reassignIssue(issueOrPR, this.payload.requested_reviewer.login);
        }
    }
}

const action = new MoveCardToReview();
action.run();
