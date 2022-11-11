import { WebhookPayload } from "@actions/github/lib/interfaces";
import { OctokitAction } from "../lib/OctokitAction";

class CreateCardForStandalonePR extends OctokitAction {
    protected async execute(): Promise<void> {
        const pr = this.payload.pull_request as WebhookPayload["pull_request"] & { id: number };
        const matches = this.fixingMatches(pr);
        if (matches) {
            this.log(`Skip, contains '$(matches[0])'`);
        } else {
            this.addAssignee(pr, this.payload.sender.login);
            await this.createCardPullRequest(pr, this.getInputNumber("column-id"));
        }
    }
}

const action = new CreateCardForStandalonePR();
action.run();
