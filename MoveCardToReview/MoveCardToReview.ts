import { PullRequestAction } from "../lib/PullRequestAction";
import { components } from "@octokit/openapi-types/types.d";

class MoveCardToReview extends PullRequestAction {

    protected async processReassignment(issue: components["schemas"]["issue"]): Promise<void> {
        if (issue.state === "open") {
            await this.reassignIssue(issue, this.payload.requested_reviewer.login);
        }
    }
}

const action = new MoveCardToReview();
action.run();
