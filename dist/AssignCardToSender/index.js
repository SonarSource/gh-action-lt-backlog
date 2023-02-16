"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const OctokitAction_1 = require("../lib/OctokitAction");
class AssignCardToSender extends OctokitAction_1.OctokitAction {
    async execute() {
        const issue = await this.downloadData(this.payload.project_card.content_url);
        if (!issue.assignee) {
            this.addAssignee(issue, this.payload.sender.login);
        }
    }
}
const action = new AssignCardToSender();
action.run();
//# sourceMappingURL=index.js.map