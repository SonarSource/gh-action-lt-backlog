import { components } from "@octokit/openapi-types/types.d";
import { PullRequestAction } from "../lib/PullRequestAction";

class MoveCardAfterReview extends PullRequestAction {

    protected async processReassignment(issue: components["schemas"]["issue"]): Promise<void> {
        await this.reassignIssue(issue, this.payload.pull_request.user.login); // Also for closed issues
    }
}

const action = new MoveCardAfterReview();
action.run();
