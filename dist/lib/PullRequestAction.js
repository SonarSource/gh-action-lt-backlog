"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PullRequestAction = void 0;
const OctokitAction_1 = require("./OctokitAction");
const ProjectContent_1 = require("./ProjectContent");
class PullRequestAction extends OctokitAction_1.OctokitAction {
    async execute() {
        const column_id = this.getInputNumber('column-id');
        const project = ProjectContent_1.ProjectContent.FromColumn(this, column_id);
        let processPR = true;
        const pr = this.payload.pull_request;
        const fixedIssues = this.fixedIssues(pr);
        for (const fixedIssue of fixedIssues) {
            let linkedIssue = await this.getIssue(fixedIssue);
            if (linkedIssue) {
                processPR = false;
                await this.processIssue(project, column_id, linkedIssue);
            }
        }
        if (processPR) {
            const fullPR = await this.getPullRequest(pr.number);
            if (fullPR) {
                await this.processIssue(project, column_id, fullPR);
            }
        }
    }
    async processIssue(projectPromise, column_id, issueOrPR) {
        await this.processReassignment(issueOrPR);
        if (issueOrPR.state === 'open') {
            const project = await projectPromise;
            await project.moveOrCreateCard(issueOrPR, column_id);
        }
    }
}
exports.PullRequestAction = PullRequestAction;
//# sourceMappingURL=PullRequestAction.js.map