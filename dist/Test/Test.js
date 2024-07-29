"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const OctokitAction_1 = require("../lib/OctokitAction");
class Test extends OctokitAction_1.OctokitAction {
    async execute() {
        //const userEmail = this.getInput('login');
        this.log("Getting PR 600");
        const pr = await this.getPullRequest(600);
        this.log("findingEmail");
        const userEmail = await this.findEmail(this.getInput('login'));
        this.log(`Result: ${userEmail}`);
    }
}
const action = new Test();
action.run();
//# sourceMappingURL=Test.js.map