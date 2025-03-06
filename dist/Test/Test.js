"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const OctokitAction_1 = require("../lib/OctokitAction");
const TeamConfiguration_1 = require("../Data/TeamConfiguration");
class Test extends OctokitAction_1.OctokitAction {
    async execute() {
        for (const team of TeamConfiguration_1.TeamConfigurationData) {
            console.log(`Processing ${team.name} with boardId ${team.boardId}`);
            if (team.boardId) {
                try {
                    await this.jira.findSprintId(team.boardId);
                }
                catch (ex) {
                    console.log(ex.message);
                    console.log();
                }
            }
            else {
                console.log('Skip, no boardId');
            }
        }
    }
}
const action = new Test();
action.run();
//# sourceMappingURL=Test.js.map