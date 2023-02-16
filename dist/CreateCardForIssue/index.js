"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const OctokitAction_1 = require("../lib/OctokitAction");
const ProjectContent_1 = require("../lib/ProjectContent");
class CreateCardForIssue extends OctokitAction_1.OctokitAction {
    async execute() {
        const column_id = this.getInputNumber('column-id');
        const project = await ProjectContent_1.ProjectContent.FromColumn(this, column_id);
        const issue = this.payload.issue;
        if (await project.findCard(issue)) {
            this.log('Skip, card already exists');
        }
        else {
            await this.createCard(issue, column_id);
        }
    }
}
const action = new CreateCardForIssue();
action.run();
//# sourceMappingURL=index.js.map