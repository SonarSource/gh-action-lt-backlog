"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const OctokitAction_1 = require("../lib/OctokitAction");
const ProjectContent_1 = require("../lib/ProjectContent");
class CreateCardForIssueFromLabel extends OctokitAction_1.OctokitAction {
    execute() {
        return __awaiter(this, void 0, void 0, function* () {
            const labelPrefix = this.getInput("label-prefix");
            const labelName = this.payload.label.name;
            const project = yield ProjectContent_1.ProjectContent.FromProject(this, this.getInputNumber("project-id"));
            if (labelName.startsWith(labelPrefix)) {
                const columnName = labelName.substring(labelPrefix.length).trim();
                const column = project.columnFromName(columnName);
                if (column) {
                    yield project.moveOrCreateCard(this.payload.issue, column.id);
                }
            }
            else {
                this.log("Unexpected label name: " + labelName);
            }
        });
    }
}
const action = new CreateCardForIssueFromLabel();
action.run();
//# sourceMappingURL=CreateCardForIssueFromLabel.js.map