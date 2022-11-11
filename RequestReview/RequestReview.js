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
const OctokitAction_1 = require("../lib/OctokitAction");
const ProjectContent_1 = require("../lib/ProjectContent");
class RequestReview extends OctokitAction_1.OctokitAction {
    execute() {
        return __awaiter(this, void 0, void 0, function* () {
            const column_id = this.getInputNumber("column-id");
            const project = ProjectContent_1.ProjectContent.FromColumn(this, column_id);
            let processPR = true;
            const pr = this.payload.pull_request;
            const fixedIssues = this.fixedIssues(pr);
            if (fixedIssues) {
                for (const fixedIssue of fixedIssues) {
                    let linkedIssue = yield this.getIssue(fixedIssue);
                    if (linkedIssue) {
                        processPR = false;
                        this.processIssue(project, column_id, linkedIssue);
                    }
                }
            }
            if (processPR) {
                const issue = yield this.getIssue(pr.number);
                if (issue) {
                    this.processIssue(project, column_id, issue);
                }
            }
        });
    }
    processIssue(projectPromise, column_id, issue) {
        return __awaiter(this, void 0, void 0, function* () {
            if (issue.state === "open") {
                yield this.reassignIssue(issue, this.payload.requested_reviewer.login);
                const project = yield projectPromise;
                const card = yield project.findCard(issue.url);
                if (card) {
                    yield project.moveCard(card, column_id);
                }
                else {
                    yield this.createCard(issue, column_id);
                }
            }
        });
    }
}
const action = new RequestReview();
action.run();
//# sourceMappingURL=RequestReview.js.map