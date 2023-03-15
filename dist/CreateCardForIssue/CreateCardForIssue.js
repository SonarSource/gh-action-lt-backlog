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
class CreateCardForIssue extends OctokitAction_1.OctokitAction {
    execute() {
        return __awaiter(this, void 0, void 0, function* () {
            const column_id = this.getInputNumber('column-id');
            const project = yield ProjectContent_1.ProjectContent.FromColumn(this, column_id);
            const issue = this.payload.issue;
            if (yield project.findCard(issue)) {
                this.log('Skip, card already exists');
            }
            else {
                yield this.createCard(issue, column_id);
            }
        });
    }
}
const action = new CreateCardForIssue();
action.run();
//# sourceMappingURL=CreateCardForIssue.js.map