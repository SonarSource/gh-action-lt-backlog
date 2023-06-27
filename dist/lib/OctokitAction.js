"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OctokitAction = void 0;
const core = require("@actions/core");
const github = require("@actions/github");
const Action_1 = require("./Action");
const ProjectContent_1 = require("./ProjectContent");
class OctokitAction extends Action_1.Action {
    constructor() {
        super();
        this.octokit = github.getOctokit(core.getInput('github-token'));
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
    getInputBoolean(name) {
        return this.getInput(name).toLowerCase() === 'true';
    }
    async downloadData(url) {
        console.log('Downloading ' + url);
        return (await this.octokit.request(url)).data;
    }
    async getIssue(issue_number) {
        try {
            this.log(`Getting issue #${issue_number}`);
            return (await this.rest.issues.get(this.addRepo({ issue_number }))).data;
        }
        catch (error) {
            this.log(`Issue #${issue_number} not found: ${error}`);
            return null;
        }
    }
    async getPullRequest(pull_number) {
        try {
            this.log(`Getting PR #${pull_number}`);
            return (await this.rest.pulls.get(this.addRepo({ pull_number }))).data;
        }
        catch (error) {
            this.log(`Pull Request #${pull_number} not found: ${error}`);
            return null;
        }
    }
    async addAssignee(issue, login) {
        console.log('Assigning to: ' + login);
        await this.rest.issues.addAssignees(this.addRepo({
            issue_number: issue.number,
            assignees: [login],
        }));
    }
    async removeAssignees(issue) {
        const oldAssignees = issue.assignees.map(x => x.login);
        if (oldAssignees.length !== 0) {
            console.log('Removing assignees: ' + oldAssignees.join(', '));
            await this.rest.issues.removeAssignees(this.addRepo({
                issue_number: issue.number,
                assignees: oldAssignees,
            }));
        }
    }
    async reassignIssue(issue, login) {
        if (login.includes("[bot]")) { // Avoid "dependabot[bot]"
            console.log(`Skipping reassignment to: ${login}`);
        }
        else {
            await this.removeAssignees(issue);
            await this.addAssignee(issue, login);
        }
    }
    fixedIssues(pr) {
        const fixes = "(?:close|closes|closed|fix|fixes|fixed|resolve|resolves|resolved)";
        const url = this.escapeRegex(`https://github.com/${this.repo.owner}/${this.repo.repo}/issues/`);
        const capturingId = "(\\d+)";
        const issueId = "#" + capturingId;
        const issueUrl = url + capturingId;
        const issueLink = `\\[[^\\]]+\\]\\(${url}${capturingId}\\)`;
        const pattern = `${fixes}\\s*(?:${issueId}|${issueUrl}|${issueLink})`;
        const regex = new RegExp(pattern, "gi");
        let result = [];
        let match;
        while (match = regex.exec(pr.body)) {
            result = result.concat(match.map(x => parseInt(x)).filter(x => !isNaN(x)));
        }
        return result;
    }
    async createCard(issueOrPR, column_id) {
        if (column_id === 0) {
            this.log(`Skip creating card for #${issueOrPR.number}. column_id was not set.`);
        }
        else {
            const project = await ProjectContent_1.ProjectContent.fromColumn(this, column_id);
            project.createCard(issueOrPR, column_id);
        }
    }
    async createNote(note, column_id) {
        if (column_id === 0) {
            this.log("Skip creating card for note. column_id was not set.");
        }
        else {
            this.log(`Creating note in column ${column_id}`);
            await this.rest.projects.createCard({ column_id, note });
        }
    }
    escapeRegex(string) {
        return string.replace(/[/\-\\^$*+?.()|[\]{}]/g, '\\$&');
    }
}
exports.OctokitAction = OctokitAction;
//# sourceMappingURL=OctokitAction.js.map