"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const OctokitAction_1 = require("../lib/OctokitAction");
class CreateCardForIssue extends OctokitAction_1.OctokitAction {
    async execute() {
        await this.createCard(this.payload.issue, this.getInputNumber('column-id'));
    }
}
const action = new CreateCardForIssue();
action.run();
//# sourceMappingURL=CreateCardForIssue.js.map