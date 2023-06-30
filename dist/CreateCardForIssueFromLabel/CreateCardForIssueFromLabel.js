"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const OctokitAction_1 = require("../lib/OctokitAction");
const ProjectContent_1 = require("../lib/ProjectContent");
class CreateCardForIssueFromLabel extends OctokitAction_1.OctokitAction {
    async execute() {
        const labelPrefix = this.getInput('label-prefix');
        const labelName = this.payload.label.name;
        if (labelName.startsWith(labelPrefix)) {
            const project = await ProjectContent_1.ProjectContent.fromProject(this, this.getInputNumber('project-id'));
            const columnName = labelName.substring(labelPrefix.length).trim();
            const column = project.columnFromName(columnName);
            if (column) {
                await project.moveOrCreateCard(this.payload.issue, column.id);
            }
        }
        else {
            this.log('Unexpected label name: ' + labelName);
        }
    }
}
const action = new CreateCardForIssueFromLabel();
action.run();
//# sourceMappingURL=CreateCardForIssueFromLabel.js.map