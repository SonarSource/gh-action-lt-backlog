import { IssueOrPR } from "../lib/IssueOrPR";
import { OctokitAction } from "../lib/OctokitAction";

class CreateCardForIssue extends OctokitAction {

    protected async execute(): Promise<void> {
        const column_id = this.getInputNumber("column-id");
        await this.createCard(this.payload.issue as IssueOrPR, column_id);
    }
}

const action = new CreateCardForIssue();
action.run();
