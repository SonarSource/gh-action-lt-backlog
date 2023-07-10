"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const OctokitAction_1 = require("../lib/OctokitAction");
class CopyLabelToPR extends OctokitAction_1.OctokitAction {
    async execute() {
        const pr = this.payload.pull_request;
        const fixedIssues = this.fixedIssues(pr);
        if (fixedIssues.length !== 0) {
            this.log(`Skip, fixes issues`);
            return;
        }
        const mentionedIssues = this.mentionedIssues(pr);
        if (mentionedIssues.length === 0) {
            this.log("Skip, there are no issues mentioned");
            return;
        }
        const labelPrefix = this.getInput("label-prefix");
        for (const issueNumber of mentionedIssues) {
            const issue = await this.getIssue(issueNumber);
            const labels = issue.labels.map(x => x).filter(x => x.name.startsWith(labelPrefix)).map(x => x.name);
            this.addLabels(pr, labels);
        }
    }
}
const action = new CopyLabelToPR();
action.run();
//# sourceMappingURL=CopyLabelToPR.js.map