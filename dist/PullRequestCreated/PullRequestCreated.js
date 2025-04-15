"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const OctokitAction_1 = require("../lib/OctokitAction");
const Constants_1 = require("../lib/Constants");
const NewIssueData_1 = require("../lib/NewIssueData");
class PullRequestCreated extends OctokitAction_1.OctokitAction {
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
            linkedIssues = [await this.processNewJiraIssue(pr)];
        }
        else if (pr.title !== this.cleanupWhitespace(pr.title)) { // New issues do this when persisting issue ID
            await this.updatePullRequestTitle(pr.number, this.cleanupWhitespace(pr.title));
        }
        await this.addLinkedIssuesToDescription(pr, linkedIssues);
    }
    async processNewJiraIssue(pr) {
        const data = await NewIssueData_1.NewIssueData.create(this.jira, pr, this.getInput('jira-project'), this.getInput('additional-fields'), await this.findEmail(this.payload.sender.login));
        if (data) {
            const issueId = await this.jira.createIssue(data.projectKey, pr.title, data.additionalFields);
            if (issueId == null) {
                this.setFailed('Failed to create a new issue in Jira');
                return null;
            }
            else {
                await this.persistIssueId(pr, issueId);
                await this.jira.moveIssue(issueId, 'Commit'); // OPEN  -> TO DO
                if (data.accountId != null) {
                    await this.jira.moveIssue(issueId, 'Start'); // TO DO -> IN PROGRESS only for real accounts, no bots GHA-8
                    await this.jira.assignIssueToAccount(issueId, data.accountId); // Even if there's already a reviewer, we need this first to populate the lastAssignee field in Jira.
                }
                if (this.payload.pull_request.requested_reviewers.length > 0) { // When PR is created directly with a reviewer, process it here. RequestReview action can be scheduled faster and PR title might not have an issue ID yet
                    await this.processRequestReview(issueId, this.payload.pull_request.requested_reviewers[0]);
                }
                return issueId;
            }
        }
        else {
            return null;
        }
    }
    async persistIssueId(pr, issueId) {
        pr.title = this.cleanupWhitespace(`${issueId} ${pr.title}`);
        await this.updatePullRequestTitle(pr.number, pr.title);
    }
    cleanupWhitespace(value) {
        return value.replace(/\s\s+/g, " ").trim(); // Mainly remove triple space between issue ID and title when copying from Jira
    }
    async addLinkedIssuesToDescription(pr, linkedIssues) {
        console.log(`Adding the following ticket in description: ${linkedIssues}`);
        await this.updatePullRequestDescription(pr.number, `${linkedIssues.map(x => this.issueLink(x)).join('\n')}\n\n${pr.body || ''}`);
    }
    issueLink(issue) {
        return `[${issue}](${Constants_1.JIRA_DOMAIN}/browse/${issue})`;
    }
}
const action = new PullRequestCreated();
action.run();
//# sourceMappingURL=PullRequestCreated.js.map