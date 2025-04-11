"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const OctokitAction_1 = require("../lib/OctokitAction");
const Constants_1 = require("../lib/Constants");
class PullRequestCreatedForEngExp extends OctokitAction_1.OctokitAction {
    async execute() {
        if (/DO NOT MERGE/i.test(this.payload.pull_request.title)) {
            this.log("'DO NOT MERGE' found in the PR title, skipping the action.");
            return;
        }
        const pr = await this.getPullRequest(this.payload.pull_request.number);
        if (pr == null) {
            return;
        }
        let linkedIssues = pr.title.match(Constants_1.JIRA_ISSUE_PATTERN);
        if (linkedIssues == null) {
            const issueId = await this.processNewJiraIssue(pr);
            await this.updatePullRequestTitle(pr.number, `${issueId} ${pr.title}`);
            linkedIssues = [issueId];
        }
        for (const issue of linkedIssues) {
            await this.updateJiraComponent(issue);
        }
    }
    async processNewJiraIssue(pr) {
        // FIXME: Implement
        return null;
    }
    async createJiraComponent(projectKey, component) {
        //FIXME: If not exist, add component
    }
    async updateJiraComponent(issueId) {
        const component = this.repo.repo;
        await this.createJiraComponent(issueId.split('-')[0], component);
        //FIXME: Add component
    }
}
const action = new PullRequestCreatedForEngExp();
action.run();
//# sourceMappingURL=PullRequestCreatedForEngExp.js.map