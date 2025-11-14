"use strict";
/*
 * Backlog Automation
 * Copyright (C) 2022-2025 SonarSource Sàrl
 * mailto: info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 3 of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with this program; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PullRequestCreated = void 0;
const OctokitAction_1 = require("../lib/OctokitAction");
const Constants_1 = require("../lib/Constants");
const NewIssueData_1 = require("../lib/NewIssueData");
class PullRequestCreated extends OctokitAction_1.OctokitAction {
    async execute() {
        const inputJiraProject = this.inputString('jira-project');
        const inputAdditionalFields = this.inputString('additional-fields');
        if (this.isEngXpSquad) {
            if (inputJiraProject) {
                this.setFailed('jira-project input is not supported when is-eng-xp-squad is set.');
                return;
            }
            if (inputAdditionalFields) {
                this.setFailed('additional-fields input is not supported when is-eng-xp-squad is set.');
                return;
            }
        }
        if (/DO NOT MERGE/i.test(this.payload.pull_request.title)) {
            this.log("'DO NOT MERGE' found in the PR title, skipping the action.");
            return;
        }
        const pr = await this.loadPullRequest(this.payload.pull_request.number);
        if (pr == null) {
            return;
        }
        let fixedIssues = await this.findFixedIssues(pr);
        if (fixedIssues == null) {
            const issueId = await this.processNewJiraIssue(pr, inputJiraProject, inputAdditionalFields);
            if (issueId) {
                fixedIssues = [issueId];
            }
        }
        else if (pr.title !== this.cleanupWhitespace(pr.title)) { // New issues do this when persisting issue ID
            await this.updatePullRequestTitle(pr.number, this.cleanupWhitespace(pr.title));
        }
        if (fixedIssues) {
            if (!pr.isRenovate()) { // Renovate already has a comment with issue ID to persist the actual issue
                await this.addLinkedIssuesAsComment(pr, fixedIssues);
            }
            if (this.isEngXpSquad) {
                for (const issue of fixedIssues) {
                    await this.addJiraComponent(issue, this.repo.repo, this.payload.repository.html_url);
                }
            }
        }
    }
    async processNewJiraIssue(pr, inputJiraProject, inputAdditionalFields) {
        const data = this.isEngXpSquad
            ? await NewIssueData_1.NewIssueData.createForEngExp(this.jira, pr, await this.findEmail(this.payload.sender.login))
            : await NewIssueData_1.NewIssueData.create(this.jira, pr, inputJiraProject, inputAdditionalFields, await this.findEmail(this.payload.sender.login), this.inputString('fallback-team'));
        if (data) {
            const issueId = await this.jira.createIssue(data.projectKey, pr.title, data.additionalFields);
            if (issueId == null) {
                this.setFailed('Failed to create a new issue in Jira');
                return null;
            }
            else {
                await this.persistIssueId(pr, issueId);
                await this.jira.addIssueRemoteLink(issueId, pr.html_url);
                await this.jira.moveIssue(issueId, 'Commit'); // OPEN  -> TO DO
                if (data.accountId) {
                    await this.jira.moveIssue(issueId, 'Start'); // TO DO -> IN PROGRESS only for real accounts, no bots GHA-8
                }
                if (data.assigneeId) {
                    await this.jira.assignIssueToAccount(issueId, data.assigneeId); // Even if there's already a reviewer, we need this first to populate the lastAssignee field in Jira.
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
        if (pr.isRenovate()) { // Renovate overrides the PR title back to the original https://github.com/renovatebot/renovate/issues/26833
            await this.addComment(pr.number, Constants_1.RENOVATE_PREFIX + this.issueLink(issueId)); // We'll store the ID in comment as a workaround
        }
        else {
            pr.title = this.cleanupWhitespace(`${issueId} ${pr.title}`);
            await this.updatePullRequestTitle(pr.number, pr.title);
        }
    }
    cleanupWhitespace(value) {
        return value.replace(/\s\s+/g, " ").trim(); // Mainly remove triple space between issue ID and title when copying from Jira
    }
    async addLinkedIssuesAsComment(pr, linkedIssues) {
        console.log(`Adding the following ticket as comment: ${linkedIssues}`);
        await this.addComment(pr.number, linkedIssues.map(x => this.issueLink(x)).join('\n'));
    }
    issueLink(issue) {
        return `[${issue}](${Constants_1.JIRA_DOMAIN}/browse/${issue})`;
    }
}
exports.PullRequestCreated = PullRequestCreated;
//# sourceMappingURL=PullRequestCreated.js.map