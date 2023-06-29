"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const OctokitAction_1 = require("../lib/OctokitAction");
class CreateNote extends OctokitAction_1.OctokitAction {
    async execute() {
        await this.createNote(this.getInput("note"), this.getInputNumber("column-id"));
    }
}
const action = new CreateNote();
action.run();
//# sourceMappingURL=CreateNote.js.map