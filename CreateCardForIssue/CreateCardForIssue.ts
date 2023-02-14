import { IssueOrPR } from "../src/IssueOrPR";
import { OctokitAction } from "../src/OctokitAction";
import { ProjectContent } from "../src/ProjectContent";

class CreateCardForIssue extends OctokitAction {

    protected async execute(): Promise<void> {
        const column_id = this.getInputNumber("column-id");
        const project = await ProjectContent.FromColumn(this, column_id);
        const issue = this.payload.issue as IssueOrPR;
        if (await project.findCard(issue)) {
            this.log("Skip, card already exists");
        } else {
            await this.createCard(issue, column_id);
        }
    }
}

const action = new CreateCardForIssue();
action.run();
