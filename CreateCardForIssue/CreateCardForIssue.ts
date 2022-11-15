import { IssueOrPR } from "../lib/IssueOrPR";
import { OctokitAction } from "../lib/OctokitAction";

class CreateCardForIssue extends OctokitAction {

    protected execute(): Promise<void> {
        throw new Error("Method not implemented.");
    }
}

const action = new CreateCardForIssue();
action.run();
