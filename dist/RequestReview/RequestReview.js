"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const OctokitAction_1 = require("../lib/OctokitAction");
class RequestReview extends OctokitAction_1.OctokitAction {
    async execute() {
        this.log("Lorem ipsum");
        const pr = await this.getPullRequest(1);
        this.log(pr.title);
        // FIXME: Move card
        // FIXME: Change assignee
    }
}
const action = new RequestReview();
action.run();
//# sourceMappingURL=RequestReview.js.map