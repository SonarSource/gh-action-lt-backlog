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
exports.OctokitAction = void 0;
const core = require("@actions/core");
const github = require("@actions/github");
const Action_1 = require("./Action");
class OctokitAction extends Action_1.Action {
    constructor() {
        super();
        this.octokit = github.getOctokit(core.getInput("github-token"));
        this.rest = this.octokit.rest;
    }
    getInput(name) {
        return core.getInput(name);
    }
    getInputNumber(name) {
        const input = this.getInput(name);
        const value = parseInt(input);
        if (isNaN(value)) {
            throw new Error(`Value of input '${name}' is not a number: ${input}`);
        }
        else {
            return value;
        }
    }
    downloadData(url) {
        return __awaiter(this, void 0, void 0, function* () {
            console.log("Downloading " + url);
            return (yield this.octokit.request(url)).data;
        });
    }
    getIssue(issue_number) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                this.log(`Getting issue #${issue_number}`);
                return (yield this.rest.issues.get(this.addRepo({ issue_number }))).data;
            }
            catch (error) {
                this.log(`Issue #${issue_number} not found: ${error}`);
                return null;
            }
        });
    }
    addAssignee(issue, login) {
        return __awaiter(this, void 0, void 0, function* () {
            console.log("Assigning to: " + login);
            yield this.rest.issues.addAssignees(this.addRepo({
                issue_number: issue.number,
                assignees: [login]
            }));
        });
    }
    fixingMatches(pr) {
        var _a;
        return (_a = pr.body) === null || _a === void 0 ? void 0 : _a.match(/(close|closes|closed|fix|fixes|fixed|resolve|resolves|resolved)\s*#\d+/gi);
    }
    createCardIssue(issue, column_id) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.createCard(column_id, issue.id, "Issue");
        });
    }
    createCardPullRequest(pr, column_id) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.createCard(column_id, pr.id, "PullRequest");
        });
    }
    createCard(column_id, content_id, content_type) {
        return __awaiter(this, void 0, void 0, function* () {
            if (column_id === 0) {
                this.log(`Skip creating ${content_type} card.`);
            }
            else {
                this.log(`Creating ${content_type} card`);
                return (yield this.rest.projects.createCard({ column_id, content_id, content_type })).data;
            }
        });
    }
}
exports.OctokitAction = OctokitAction;
//# sourceMappingURL=OctokitAction.js.map