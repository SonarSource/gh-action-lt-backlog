"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const OctokitAction_1 = require("../lib/OctokitAction");
class CreateRspecIssue extends OctokitAction_1.OctokitAction {
    async execute() {
        this.log('Creating issue');
        const { data: issue } = await this.rest.issues.create(this.addRepo({
            title: `Update RSPEC before ${this.payload.milestone.title} release`,
            milestone: this.payload.milestone.number,
            labels: ['Type: Tooling'],
        }));
        this.log(`Created issue #${issue.number}: ${issue.html_url}`);
        await this.createCard(issue, this.getInputNumber('column-id'));
    }
}
const action = new CreateRspecIssue();
action.run();
//# sourceMappingURL=CreateRspecIssue.js.map