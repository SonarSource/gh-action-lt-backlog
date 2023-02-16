"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const OctokitAction_1 = require("../lib/OctokitAction");
class CreateCardForStandalonePR extends OctokitAction_1.OctokitAction {
    async execute() {
        const pr = this.payload.pull_request;
        const fixedIssues = this.fixedIssues(pr);
        if (fixedIssues.length === 0) {
            await this.addAssignee(pr, this.payload.sender.login);
            await this.createCard(pr, this.getInputNumber('column-id'));
        }
        else {
            this.log(`Skip, fixes issues`);
        }
    }
}
const action = new CreateCardForStandalonePR();
action.run();
//# sourceMappingURL=index.js.map