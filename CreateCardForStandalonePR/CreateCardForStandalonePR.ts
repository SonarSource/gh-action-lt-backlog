import { OctokitAction } from "../lib/OctokitAction";
import { components } from "@octokit/openapi-types/types.d";

class CreateCardForStandalonePR extends OctokitAction {
    protected async execute(): Promise<void> {
        const pr = this.payload.pull_request as components["schemas"]["issue"];
        const fixedIssues = this.fixedIssues(pr);
        if (fixedIssues) {
            this.log(`Skip, fixes issues`);
        } else {
            this.addAssignee(pr, this.payload.sender.login);
            await this.createCard(pr, this.getInputNumber("column-id"));
        }
    }
}

const action = new CreateCardForStandalonePR();
action.run();
