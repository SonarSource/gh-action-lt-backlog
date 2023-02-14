import { PullRequestAction } from "../src/PullRequestAction";
import { IssueOrPR } from "../src/IssueOrPR";

class MoveCardToReview extends PullRequestAction {

    protected async processReassignment(issueOrPR: IssueOrPR): Promise<void> {
        if (issueOrPR.state === "open") {
            await this.reassignIssue(issueOrPR, this.payload.requested_reviewer.login);
        }
    }
}

const action = new MoveCardToReview();
action.run();
