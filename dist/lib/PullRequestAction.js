"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PullRequestAction = void 0;
const OctokitAction_1 = require("./OctokitAction");
const ProjectContent_1 = require("./ProjectContent");
class PullRequestAction extends OctokitAction_1.OctokitAction {
    async execute() {
        let column_id = this.getInput('column-id');
        const projectNumber = this.getInput('project-number');
        let project;
        if (projectNumber) {
            project = ProjectContent_1.ProjectContentV2.fromProject(this, parseInt(projectNumber));
        }
        else {
            column_id = parseInt(column_id);
            project = ProjectContent_1.ProjectContentV1.fromColumn(this, column_id);
        }
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