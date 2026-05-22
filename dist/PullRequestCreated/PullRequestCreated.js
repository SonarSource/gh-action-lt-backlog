/*
 * Backlog Automation
 * Copyright (C) SonarSource Sàrl
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
import { OctokitAction } from '../lib/OctokitAction.js';
import { RENOVATE_PREFIX } from '../lib/Constants.js';
import { NewIssueData } from '../lib/NewIssueData.js';
import { TeamReviewData } from '../lib/TeamReviewData.js';
export class PullRequestCreated extends OctokitAction {
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
        if (/DO NOT MERGE/i.test(this.payload.pull_request?.title)) {
            this.log("'DO NOT MERGE' found in the PR title, skipping the action.");
            return;
        }
        const pr = await this.loadPullRequest(this.payload.pull_request.number);
        if (pr == null) {
            return;
        }
        let accountId = undefined;
        let fixedIssues = await this.findFixedIssues(pr);
        if (fixedIssues == null) {
            accountId = await this.loadSenderAccountId();
            const issueId = await this.processNewJiraIssue(pr, inputJiraProject, inputAdditionalFields, accountId);
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
            for (const issue of fixedIssues) {
                await this.jira.addIssueRemoteLink(issue, pr.html_url);
                await this.processAllReviews(pr, issue, accountId);
            }
            if (this.isEngXpSquad) {
                for (const issue of fixedIssues.filter(x => x.startsWith('BUILD-'))) { // BUILD-9328: No component for PREQ tickets
                    await this.addJiraComponent(issue, this.repo.repo, this.payload.repository?.html_url);
                }
            }
        }
    }
    async processNewJiraIssue(pr, inputJiraProject, inputAdditionalFields, accountId) {
        const data = this.isEngXpSquad
            ? await NewIssueData.createForEngExp(this.jira, pr, accountId)
            : await NewIssueData.create(this.jira, pr, inputJiraProject, inputAdditionalFields, accountId, this.inputString('fallback-team'));
        if (data) {
            const issueId = await this.jira.createIssue(data.projectKey, pr.title, data.additionalFields);
            if (issueId) {
                await this.persistIssueId(pr, issueId);
                await this.jira.moveIssue(issueId, 'Commit'); // OPEN  -> TO DO
                if (data.accountId) {
                    await this.jira.moveIssue(issueId, 'Start'); // TO DO -> IN PROGRESS only for real accounts, no bots GHA-8
                }
                if (data.assigneeId) {
                    await this.jira.assignIssueToAccount(issueId, data.assigneeId); // Even if there's already a reviewer, we need this first to populate the lastAssignee field in Jira.
                }
                return issueId;
            }
            else {
                this.setFailed('Failed to create a new issue in Jira');
                return null;
            }
        }
        else {
            return null;
        }
    }
    async processAllReviews(pr, issueId, accountId) {
        // When PR is created directly with a reviewer, process it here. RequestReview action can be scheduled faster and PR title might not have an issue ID yet
        if (this.payload.pull_request) {
            await this.processRequestReview(pr, issueId, this.payload.pull_request.requested_reviewers[0] || null, null);
            for (const team of this.payload.pull_request.requested_teams) {
                this.log(`Processing team review request: ${team.name}`);
                const teamReview = accountId === undefined
                    ? await TeamReviewData.createFromUser(team, async () => await this.loadSenderAccountId())
                    : TeamReviewData.createFromAccount(team, accountId);
                if (teamReview) {
                    accountId = teamReview.accountId; // In case it was undefined, reuse the loaded one
                    await this.processRequestReview(pr, issueId, null, teamReview);
                }
            }
        }
    }
    async persistIssueId(pr, issueId) {
        if (pr.isRenovate()) { // Renovate overrides the PR title back to the original https://github.com/renovatebot/renovate/issues/26833
            await this.addComment(pr.number, RENOVATE_PREFIX + this.issueLink(issueId)); // We'll store the ID in comment as a workaround
        }
        else {
            pr.title = this.cleanupWhitespace(`${issueId} ${pr.title}`);
            await this.updatePullRequestTitle(pr.number, pr.title);
        }
    }
    cleanupWhitespace(value) {
        return value.replaceAll(/\s\s+/g, " ").trim(); // Mainly remove triple space between issue ID and title when copying from Jira
    }
    async addLinkedIssuesAsComment(pr, linkedIssues) {
        console.log(`Adding the following ticket as comment: ${linkedIssues}`);
        await this.addComment(pr.number, linkedIssues.map(x => this.issueLink(x)).join('\n'));
    }
}
//# sourceMappingURL=PullRequestCreated.js.map