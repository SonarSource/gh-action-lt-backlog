"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PullRequestAction = void 0;
const OctokitAction_1 = require("./OctokitAction");
const ProjectContent_1 = require("./ProjectContent");
class PullRequestAction extends OctokitAction_1.OctokitAction {
    execute() {
        return __awaiter(this, void 0, void 0, function* () {
            const column_id = this.getInputNumber("column-id");
            const project = ProjectContent_1.ProjectContent.FromColumn(this, column_id);
            let processPR = true;
            const pr = this.payload.pull_request;
            const fixedIssues = this.fixedIssues(pr);
            for (const fixedIssue of fixedIssues) {
                let linkedIssue = yield this.getIssue(fixedIssue);
                if (linkedIssue) {
                    processPR = false;
                    yield this.processIssue(project, column_id, linkedIssue);
                }
            }
            if (processPR) {
                const fullPR = yield this.getPullRequest(pr.number);
                if (fullPR) {
                    yield this.processIssue(project, column_id, fullPR);
                }
            }
        });
    }
    processIssue(projectPromise, column_id, issueOrPR) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.processReassignment(issueOrPR);
            if (issueOrPR.state === "open") {
                const project = yield projectPromise;
                const card = yield project.findCard(issueOrPR);
                if (card) {
                    yield project.moveCard(card, column_id);
                }
                else {
                    yield this.createCard(issueOrPR, column_id);
                }
            }
        });
    }
}
exports.PullRequestAction = PullRequestAction;
//# sourceMappingURL=PullRequestAction.js.map