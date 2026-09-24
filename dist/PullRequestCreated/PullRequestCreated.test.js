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
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as github from '@actions/github';
import { PullRequestCreated } from './PullRequestCreated.js';
import { LogTester } from '../tests/LogTester.js';
import { jiraClientStub } from '../tests/JiraClientStub.js';
import { createOctokitRestStub } from '../tests/OctokitRestStub.js';
class TestPullRequestCreated extends PullRequestCreated {
    async findEmails(login) {
        this.log(`findEmails called for ${login}`);
        switch (login) {
            case 'test-user': return ['user@sonarsource.com'];
            case 'test-reviewer': return ['reviewer@sonarsource.com'];
            case 'renamed': return ['unknown@sonarsource.com', 'user@sonarsource.com'];
            case 'renovate[bot]': return [];
            default: throw new Error(`Scaffolding did not expect login ${login}`);
        }
    }
    async findRootlyOnCallEmails(scheduleId) {
        this.log(`Invoked findRootlyOnCallEmails("${scheduleId}")`);
        return ["teamreview.triager@sonarsource.com"];
    }
}
async function runAction(jiraProject, title, body, user = 'test-user', requestedReviewers = [], requestedTeams = [], headRepoFullName = 'test-owner/test-repo') {
    process.env['INPUT_JIRA-PROJECT'] = jiraProject;
    const action = new TestPullRequestCreated();
    action.jira = jiraClientStub;
    action.rest = createOctokitRestStub(title, body, user, requestedReviewers, requestedTeams, headRepoFullName);
    await action.run();
}
describe('PullRequestCreated', () => {
    const originalKeys = Object.keys(process.env);
    let logTester;
    beforeEach(() => {
        logTester = new LogTester();
        for (const key of Object.keys(process.env)) {
            if (!originalKeys.includes(key)) {
                // Otherwise, changes form previous UT are propagated to the next one
                delete process.env[key];
            }
        }
        process.env['GITHUB_REPOSITORY'] = 'test-owner/test-repo';
        process.env['INPUT_GITHUB-TOKEN'] = 'fake';
        github.context.payload = {
            pull_request: {
                number: 42,
                title: "PR Title",
                body: 'PR Description',
                requested_reviewers: [],
                requested_teams: []
            },
            repository: {
                html_url: "https://github.com/test-owner/test-repo",
                name: 'test-repo',
                owner: { login: 'SonarSource' }
            },
            sender: {
                login: 'test-user',
                type: "User"
            }
        };
    });
    afterEach(() => {
        logTester?.afterEach(); // When beforeAll fails, beforeEach is not called, but afterEach is.
    });
    it('is-eng-xp-squad and jira-project fails', async () => {
        process.env['INPUT_IS-ENG-XP-SQUAD'] = 'true';
        process.env['INPUT_JIRA-PROJECT'] = 'FORBIDDEN';
        const action = new PullRequestCreated();
        const setFailedCore = vi.fn();
        action.setFailedCore = setFailedCore;
        await action.run();
        expect(setFailedCore).toHaveBeenCalledWith('Action failed: jira-project input is not supported when is-eng-xp-squad is set.');
    });
    it('is-eng-xp-squad and additional-fields fails', async () => {
        process.env['INPUT_IS-ENG-XP-SQUAD'] = 'true';
        process.env['INPUT_ADDITIONAL-FIELDS'] = '{ "Field": "Value" }';
        const action = new PullRequestCreated();
        const setFailedCore = vi.fn();
        action.setFailedCore = setFailedCore;
        await action.run();
        expect(setFailedCore).toHaveBeenCalledWith('Action failed: additional-fields input is not supported when is-eng-xp-squad is set.');
    });
    it('DO NOT MERGE PR title skips the action', async () => {
        github.context.payload.pull_request.title = "Prefix [DO not MeRGe{: Test PR";
        const action = new PullRequestCreated();
        action.log = vi.fn();
        await action.run();
        expect(action.log).toHaveBeenCalledWith("Done");
        expect(action.log).toHaveBeenCalledWith("'DO NOT MERGE' found in the PR title, skipping the action.");
    });
    it('No PR skips the action', async () => {
        class TestPullRequestCreated extends PullRequestCreated {
            async loadPullRequest(pull_number) {
                return null;
            }
        }
        const action = new TestPullRequestCreated();
        action.log = vi.fn();
        await action.run();
        expect(action.log).toHaveBeenCalledWith('Done');
        expect(action.log).toHaveBeenCalledTimes(1);
    });
    function setIssueCommentPayload(title) {
        github.context.payload = {
            issue: {
                number: 42,
                title,
                pull_request: {}
            },
            comment: {
                id: 1,
                body: '/PullRequestCreated'
            },
            repository: {
                html_url: "https://github.com/test-owner/test-repo",
                name: 'test-repo',
                owner: { login: 'SonarSource' }
            },
            sender: {
                login: 'test-user',
                type: "User"
            }
        };
    }
    it('/PullRequestCreated comment triggers issue creation for a PR without a ticket', async () => {
        setIssueCommentPayload('Standalone PR');
        await runAction('KEY', 'Standalone PR');
        expect(logTester.logsParams).toStrictEqual([
            "Loading PR #42",
            "findEmails called for test-user",
            "No mentioned issues found",
            "Looking for valid parent ticket",
            "No parent issue found",
            "No boardId is configured for team .NET Squad",
            "Found 2 Evergreen Epic(s), using NET-1000 .NET KTLO Epic",
            "Invoked jira.createIssue('KEY', 'Standalone PR', {\"issuetype\":{\"name\":\"Maintenance\"},\"customfield_10001\":\"dot-neeet-team\",\"customfield_10020\":null,\"parent\":{\"key\":\"NET-1000\"}})",
            "Updating PR #42 title to: KEY-4242 Standalone PR",
            "Invoked rest.pulls.update({\"owner\":\"test-owner\",\"repo\":\"test-repo\",\"pull_number\":42,\"title\":\"KEY-4242 Standalone PR\"})",
            "Invoked jira.moveIssue('KEY-4242', 'Commit', null)",
            "Invoked jira.moveIssue('KEY-4242', 'Start', null)",
            "Invoked jira.assignIssueToAccount('KEY-4242', '1234-account')",
            "Adding the following ticket as comment: KEY-4242",
            "Invoked rest.issues.createComment({\"owner\":\"test-owner\",\"repo\":\"test-repo\",\"issue_number\":42,\"body\":\"[KEY-4242](https://sonarsource.atlassian.net/browse/KEY-4242)\"})",
            "Invoked jira.addIssueRemoteLink('KEY-4242'', 'https://github.com/test-owner/test-repo/pull/42', null)",
            "Done"
        ]);
    });
    it('/PullRequestCreated comment does nothing while DO NOT MERGE is still in the title', async () => {
        setIssueCommentPayload('Prefix [DO not MeRGe{: Test PR');
        const action = new PullRequestCreated();
        action.log = vi.fn();
        await action.run();
        expect(action.log).toHaveBeenCalledWith("Done");
        expect(action.log).toHaveBeenCalledWith("'DO NOT MERGE' found in the PR title, skipping the action.");
    });
    it('/PullRequestCreated comment picks up reviewer requested on the loaded PR', async () => {
        setIssueCommentPayload('Standalone PR');
        await runAction('KEY', 'Standalone PR', null, 'test-user', [{ type: "User", login: "test-reviewer" }]);
        expect(logTester.logsParams).toContain("Invoked jira.moveIssue('KEY-4242', 'Request Review', null)");
        expect(logTester.logsParams).toContain("Invoked jira.assignIssueToEmail('KEY-4242', ['reviewer@sonarsource.com'])");
    });
    it('/PullRequestCreated comment on a PR with an existing ticket but no prior link backfills the linked-issue comment and remote link', async () => {
        setIssueCommentPayload('KEY-4242 Standalone PR');
        await runAction('KEY', 'KEY-4242 Standalone PR');
        expect(logTester.logsParams).toStrictEqual([
            "Loading PR #42",
            "Invoked rest.issues.listComments({\"owner\":\"test-owner\",\"repo\":\"test-repo\",\"issue_number\":42})",
            "Adding the following ticket as comment: KEY-4242",
            "Invoked rest.issues.createComment({\"owner\":\"test-owner\",\"repo\":\"test-repo\",\"issue_number\":42,\"body\":\"[KEY-4242](https://sonarsource.atlassian.net/browse/KEY-4242)\"})",
            "Invoked jira.addIssueRemoteLink('KEY-4242'', 'https://github.com/test-owner/test-repo/pull/42', null)",
            "Done"
        ]);
    });
    it('/PullRequestCreated comment on a PR that already has the linked-issue comment does not repost it', async () => {
        setIssueCommentPayload('KEY-4242 Standalone PR');
        process.env['INPUT_JIRA-PROJECT'] = 'KEY';
        const action = new TestPullRequestCreated();
        action.jira = jiraClientStub;
        action.rest = createOctokitRestStub('KEY-4242 Standalone PR', null, 'test-user');
        action.rest.issues.listComments = ((params) => {
            console.log(`Invoked rest.issues.listComments(${JSON.stringify(params)})`);
            return Promise.resolve({ data: [{ body: '[KEY-4242](https://sonarsource.atlassian.net/browse/KEY-4242)' }] });
        });
        await action.run();
        expect(logTester.logsParams).toStrictEqual([
            "Loading PR #42",
            "Invoked rest.issues.listComments({\"owner\":\"test-owner\",\"repo\":\"test-repo\",\"issue_number\":42})",
            "Done"
        ]);
    });
    it('/PullRequestCreated comment on an external PR does nothing', async () => {
        setIssueCommentPayload('Standalone PR');
        const action = new PullRequestCreated();
        action.jira = jiraClientStub;
        action.rest = createOctokitRestStub('Standalone PR', null, 'test-user', [], [], 'fork-owner/test-repo');
        action.log = vi.fn();
        await action.run();
        expect(action.log).toHaveBeenCalledWith('External PR, the ticket must be created manually.');
        expect(action.log).toHaveBeenCalledWith('Done');
    });
    it('Standalone PR user first email not linked to Jira', async () => {
        // Employee changed name and got a new email. GitHub preserves both emails, Jira only has the new one.
        await runAction('KEY', 'Title', null, 'renamed');
        expect(logTester.logsParams).toContain("Invoked jira.assignIssueToAccount('KEY-4242', '1234-account')");
    });
    it('Standalone PR no description', async () => {
        await runAction('KEY', 'Standalone PR');
        expect(logTester.logsParams).toStrictEqual([
            "Loading PR #42",
            "findEmails called for test-user",
            "No mentioned issues found",
            "Looking for valid parent ticket",
            "No parent issue found",
            "No boardId is configured for team .NET Squad",
            "Found 2 Evergreen Epic(s), using NET-1000 .NET KTLO Epic",
            "Invoked jira.createIssue('KEY', 'Standalone PR', {\"issuetype\":{\"name\":\"Maintenance\"},\"customfield_10001\":\"dot-neeet-team\",\"customfield_10020\":null,\"parent\":{\"key\":\"NET-1000\"}})",
            "Updating PR #42 title to: KEY-4242 Standalone PR",
            "Invoked rest.pulls.update({\"owner\":\"test-owner\",\"repo\":\"test-repo\",\"pull_number\":42,\"title\":\"KEY-4242 Standalone PR\"})",
            "Invoked jira.moveIssue('KEY-4242', 'Commit', null)",
            "Invoked jira.moveIssue('KEY-4242', 'Start', null)",
            "Invoked jira.assignIssueToAccount('KEY-4242', '1234-account')",
            "Adding the following ticket as comment: KEY-4242",
            "Invoked rest.issues.createComment({\"owner\":\"test-owner\",\"repo\":\"test-repo\",\"issue_number\":42,\"body\":\"[KEY-4242](https://sonarsource.atlassian.net/browse/KEY-4242)\"})",
            "Invoked jira.addIssueRemoteLink('KEY-4242'', 'https://github.com/test-owner/test-repo/pull/42', null)",
            "Done"
        ]);
    });
    it('Standalone PR with USER ticket in title', async () => {
        await runAction('KEY', 'Reproducer for USER-1234 should ignore issue ID');
        expect(logTester.logsParams).toStrictEqual([
            "Loading PR #42",
            "findEmails called for test-user",
            "No mentioned issues found",
            "Looking for valid parent ticket",
            "No parent issue found",
            "No boardId is configured for team .NET Squad",
            "Found 2 Evergreen Epic(s), using NET-1000 .NET KTLO Epic",
            "Invoked jira.createIssue('KEY', 'Reproducer for USER-1234 should ignore issue ID', {\"issuetype\":{\"name\":\"Maintenance\"},\"customfield_10001\":\"dot-neeet-team\",\"customfield_10020\":null,\"parent\":{\"key\":\"NET-1000\"}})",
            "Updating PR #42 title to: KEY-4242 Reproducer for USER-1234 should ignore issue ID",
            "Invoked rest.pulls.update({\"owner\":\"test-owner\",\"repo\":\"test-repo\",\"pull_number\":42,\"title\":\"KEY-4242 Reproducer for USER-1234 should ignore issue ID\"})",
            "Invoked jira.moveIssue('KEY-4242', 'Commit', null)",
            "Invoked jira.moveIssue('KEY-4242', 'Start', null)",
            "Invoked jira.assignIssueToAccount('KEY-4242', '1234-account')",
            "Adding the following ticket as comment: KEY-4242",
            "Invoked rest.issues.createComment({\"owner\":\"test-owner\",\"repo\":\"test-repo\",\"issue_number\":42,\"body\":\"[KEY-4242](https://sonarsource.atlassian.net/browse/KEY-4242)\"})",
            "Invoked jira.addIssueRemoteLink('KEY-4242'', 'https://github.com/test-owner/test-repo/pull/42', null)",
            "Done"
        ]);
    });
    it('Standalone PR with description', async () => {
        // Action does nothing additional when team is (auto)requested for review, but the slug does not match a known team
        await runAction('KEY', 'Standalone PR', 'Original description, this ignores USER-1234 tickets as those should not be parents', 'test-user', [], [{ name: 'test-team', slug: 'test-team' }]);
        expect(logTester.logsParams).toStrictEqual([
            "Loading PR #42",
            "findEmails called for test-user",
            "No mentioned issues found",
            "Looking for valid parent ticket",
            "No parent issue found",
            "No boardId is configured for team .NET Squad",
            "Found 2 Evergreen Epic(s), using NET-1000 .NET KTLO Epic",
            "Invoked jira.createIssue('KEY', 'Standalone PR', {\"issuetype\":{\"name\":\"Maintenance\"},\"description\":{\"type\":\"doc\",\"version\":1,\"content\":[{\"type\":\"paragraph\",\"content\":[{\"type\":\"text\",\"text\":\"Original description, this ignores USER-1234 tickets as those should not be parents\"}]}]},\"customfield_10001\":\"dot-neeet-team\",\"customfield_10020\":null,\"parent\":{\"key\":\"NET-1000\"}})",
            "Updating PR #42 title to: KEY-4242 Standalone PR",
            "Invoked rest.pulls.update({\"owner\":\"test-owner\",\"repo\":\"test-repo\",\"pull_number\":42,\"title\":\"KEY-4242 Standalone PR\"})",
            "Invoked jira.moveIssue('KEY-4242', 'Commit', null)",
            "Invoked jira.moveIssue('KEY-4242', 'Start', null)",
            "Invoked jira.assignIssueToAccount('KEY-4242', '1234-account')",
            "Processing team review request: test-team",
            "Adding the following ticket as comment: KEY-4242",
            "Invoked rest.issues.createComment({\"owner\":\"test-owner\",\"repo\":\"test-repo\",\"issue_number\":42,\"body\":\"[KEY-4242](https://sonarsource.atlassian.net/browse/KEY-4242)\"})",
            "Invoked jira.addIssueRemoteLink('KEY-4242'', 'https://github.com/test-owner/test-repo/pull/42', null)",
            "Done"
        ]);
    });
    it('Standalone PR Renovate', async () => {
        await runAction('KEY', 'Standalone PR', null, 'renovate[bot]');
        expect(logTester.logsParams).toStrictEqual([
            "Loading PR #42",
            "Invoked rest.issues.listComments({\"owner\":\"test-owner\",\"repo\":\"test-repo\",\"issue_number\":42})",
            "findEmails called for test-user",
            "No boardId is configured for team .NET Squad",
            "Found 2 Evergreen Epic(s), using NET-1000 .NET KTLO Epic",
            "Invoked jira.createIssue('KEY', 'Standalone PR', {\"issuetype\":{\"name\":\"Maintenance\"},\"customfield_10001\":\"dot-neeet-team\",\"customfield_10020\":null,\"parent\":{\"key\":\"NET-1000\"}})",
            "Invoked rest.issues.createComment({\"owner\":\"test-owner\",\"repo\":\"test-repo\",\"issue_number\":42,\"body\":\"Renovate Jira issue ID: [KEY-4242](https://sonarsource.atlassian.net/browse/KEY-4242)\"})",
            "Invoked jira.moveIssue('KEY-4242', 'Commit', null)",
            "Invoked jira.moveIssue('KEY-4242', 'Start', null)",
            "Invoked jira.assignIssueToAccount('KEY-4242', '1234-account')",
            "Invoked jira.addIssueRemoteLink('KEY-4242'', 'https://github.com/test-owner/test-repo/pull/42', null)",
            "Done"
        ]);
    });
    it('/PullRequestCreated comment on a Renovate PR backfills the remote link despite the bookkeeping comment', async () => {
        setIssueCommentPayload('Standalone PR');
        process.env['INPUT_JIRA-PROJECT'] = 'KEY';
        const action = new TestPullRequestCreated();
        action.jira = jiraClientStub;
        action.rest = createOctokitRestStub('Standalone PR', null, 'renovate[bot]');
        action.rest.issues.listComments = ((params) => {
            console.log(`Invoked rest.issues.listComments(${JSON.stringify(params)})`);
            return Promise.resolve({ data: [{ body: 'Renovate Jira issue ID: [KEY-4242](https://sonarsource.atlassian.net/browse/KEY-4242)' }] });
        });
        await action.run();
        expect(logTester.logsParams).toContain("Invoked jira.addIssueRemoteLink('KEY-4242'', 'https://github.com/test-owner/test-repo/pull/42', null)");
        expect(logTester.logsParams).not.toContain("Adding the following ticket as comment: KEY-4242");
    });
    it('Standalone PR with reviewer', async () => {
        await runAction('KEY', 'Standalone PR', null, 'test-user', [{ type: "User", login: "test-reviewer" }]);
        expect(logTester.logsParams).toStrictEqual([
            "Loading PR #42",
            "findEmails called for test-user",
            "No mentioned issues found",
            "Looking for valid parent ticket",
            "No parent issue found",
            "No boardId is configured for team .NET Squad",
            "Found 2 Evergreen Epic(s), using NET-1000 .NET KTLO Epic",
            "Invoked jira.createIssue('KEY', 'Standalone PR', {\"issuetype\":{\"name\":\"Maintenance\"},\"customfield_10001\":\"dot-neeet-team\",\"customfield_10020\":null,\"parent\":{\"key\":\"NET-1000\"}})",
            "Updating PR #42 title to: KEY-4242 Standalone PR",
            "Invoked rest.pulls.update({\"owner\":\"test-owner\",\"repo\":\"test-repo\",\"pull_number\":42,\"title\":\"KEY-4242 Standalone PR\"})",
            "Invoked jira.moveIssue('KEY-4242', 'Commit', null)",
            "Invoked jira.moveIssue('KEY-4242', 'Start', null)",
            "Invoked jira.assignIssueToAccount('KEY-4242', '1234-account')",
            "Invoked jira.moveIssue('KEY-4242', 'Request Review', null)",
            "findEmails called for test-reviewer",
            "Invoked jira.assignIssueToEmail('KEY-4242', ['reviewer@sonarsource.com'])",
            "Adding the following ticket as comment: KEY-4242",
            "Invoked rest.issues.createComment({\"owner\":\"test-owner\",\"repo\":\"test-repo\",\"issue_number\":42,\"body\":\"[KEY-4242](https://sonarsource.atlassian.net/browse/KEY-4242)\"})",
            "Invoked jira.addIssueRemoteLink('KEY-4242'', 'https://github.com/test-owner/test-repo/pull/42', null)",
            "Done"
        ]);
    });
    it('Standalone PR with team review', async () => {
        process.env['INPUT_TEAM-REVIEW-COMPONENT'] = 'Parameter Component';
        await runAction('KEY', 'Standalone PR', null, 'test-user', [], [
            { name: "another-team", slug: "another-team" }, // NO OP
            { name: "platform-cloud-engineering-squad", slug: "platform-cloud-engineering-squad" }, // Requests review, queries accountId
            { name: "platform-cloud-production-engineering-squad", slug: "platform-cloud-production-engineering-squad" } // Requests review, reuses accountId
        ]);
        expect(logTester.logsParams).toStrictEqual([
            "Loading PR #42",
            "findEmails called for test-user",
            "No mentioned issues found",
            "Looking for valid parent ticket",
            "No parent issue found",
            "No boardId is configured for team .NET Squad",
            "Found 2 Evergreen Epic(s), using NET-1000 .NET KTLO Epic",
            "Invoked jira.createIssue('KEY', 'Standalone PR', {\"issuetype\":{\"name\":\"Maintenance\"},\"customfield_10001\":\"dot-neeet-team\",\"customfield_10020\":null,\"parent\":{\"key\":\"NET-1000\"}})",
            "Updating PR #42 title to: KEY-4242 Standalone PR",
            "Invoked rest.pulls.update({\"owner\":\"test-owner\",\"repo\":\"test-repo\",\"pull_number\":42,\"title\":\"KEY-4242 Standalone PR\"})",
            "Invoked jira.moveIssue('KEY-4242', 'Commit', null)",
            "Invoked jira.moveIssue('KEY-4242', 'Start', null)",
            "Invoked jira.assignIssueToAccount('KEY-4242', '1234-account')",
            "Processing team review request: another-team",
            "Processing team review request: platform-cloud-engineering-squad",
            "Loading members of platform-cloud-engineering-squad",
            "Invoked rest.teams.listMembersInOrg({\"org\":\"test-owner\",\"team_slug\":\"platform-cloud-engineering-squad\",\"per_page\":100})",
            "Loading members of platform-cloud-production-engineering-squad",
            "Invoked rest.teams.listMembersInOrg({\"org\":\"test-owner\",\"team_slug\":\"platform-cloud-production-engineering-squad\",\"per_page\":100})",
            "Invoked findRootlyOnCallEmails(\"c461f921-6c62-4039-8c5e-59500682ccb0\")",
            "Invoked jira.moveIssue('KEY-4242', 'Request Review', null)",
            "Found 1 Evergreen Epic(s), using SC-1000 Current SC Review Epic platform-cloud-engineering-squad",
            "Creating PREQ review issue",
            "Invoked jira.createIssue('PREQ', 'PR review for KEY-4242 Standalone PR', {\"issuetype\":{\"name\":\"Maintenance\"},\"reporter\":{\"id\":\"1234-account\"},\"customfield_10001\":\"772ea1dc-3574-42bc-a378-7a898d910ebd\",\"labels\":[\"preq-review-code\"],\"parent\":{\"key\":\"SC-1000\"}})",
            "Invoked jira.assignIssueToAccount('PREQ-4242', '5000-teamreview-triager-account')",
            "Invoked jira.addIssueRemoteLink('PREQ-4242'', 'https://github.com/test-owner/test-repo/pull/42', null)",
            "Invoked jira.linkIssues('PREQ-4242', 'KEY-4242', 'Relates')",
            "Invoked rest.issues.createComment({\"owner\":\"test-owner\",\"repo\":\"test-repo\",\"issue_number\":42,\"body\":\"Team Review Jira issue ID: [PREQ-4242](https://sonarsource.atlassian.net/browse/PREQ-4242) platform-cloud-engineering-squad\\n<!--slug: platform-cloud-engineering-squad -->\"})",
            "Invoked jira.createComponent('PREQ', 'Parameter Component', 'null')",
            "Invoked jira.addIssueComponent('PREQ-4242', 'Parameter Component')",
            "Processing team review request: platform-cloud-production-engineering-squad",
            "Invoked findRootlyOnCallEmails(\"c461f921-6c62-4039-8c5e-59500682ccb0\")",
            "Invoked jira.moveIssue('KEY-4242', 'Request Review', null)",
            "Found 1 Evergreen Epic(s), using SC-2222 Current SC Review Epic platform-cloud-production-engineering-squad",
            "Creating PREQ review issue",
            "Invoked jira.createIssue('PREQ', 'PR review for KEY-4242 Standalone PR', {\"issuetype\":{\"name\":\"Maintenance\"},\"reporter\":{\"id\":\"1234-account\"},\"customfield_10001\":\"6f2e744b-9f09-4c3a-852e-e2f138d1c14f\",\"labels\":[\"preq-review-code\"],\"parent\":{\"key\":\"SC-2222\"}})",
            "Invoked jira.assignIssueToAccount('PREQ-4242', '5000-teamreview-triager-account')",
            "Invoked jira.addIssueRemoteLink('PREQ-4242'', 'https://github.com/test-owner/test-repo/pull/42', null)",
            "Invoked jira.linkIssues('PREQ-4242', 'KEY-4242', 'Relates')",
            "Invoked rest.issues.createComment({\"owner\":\"test-owner\",\"repo\":\"test-repo\",\"issue_number\":42,\"body\":\"Team Review Jira issue ID: [PREQ-4242](https://sonarsource.atlassian.net/browse/PREQ-4242) platform-cloud-production-engineering-squad\\n<!--slug: platform-cloud-production-engineering-squad -->\"})",
            "Invoked jira.createComponent('PREQ', 'Parameter Component', 'null')",
            "Invoked jira.addIssueComponent('PREQ-4242', 'Parameter Component')",
            "Adding the following ticket as comment: KEY-4242",
            "Invoked rest.issues.createComment({\"owner\":\"test-owner\",\"repo\":\"test-repo\",\"issue_number\":42,\"body\":\"[KEY-4242](https://sonarsource.atlassian.net/browse/KEY-4242)\"})",
            "Invoked jira.addIssueRemoteLink('KEY-4242'', 'https://github.com/test-owner/test-repo/pull/42', null)",
            "Done"
        ]);
    });
    it('Standalone PR isEngXpSquad', async () => {
        process.env['INPUT_IS-ENG-XP-SQUAD'] = 'true';
        await runAction('', 'Standalone PR');
        expect(logTester.logsParams).toStrictEqual([
            "Loading PR #42",
            "findEmails called for test-user",
            "Invoked jira.createIssue('PREQ', 'Standalone PR', {\"issuetype\":{\"name\":\"Maintenance\"},\"reporter\":{\"id\":\"1234-account\"},\"customfield_10001\":\"eb40f25e-3596-4541-b661-cf83e7bc4fa6\",\"labels\":[\"dvi-created-by-automation\"]})",
            "Updating PR #42 title to: PREQ-4242 Standalone PR",
            "Invoked rest.pulls.update({\"owner\":\"test-owner\",\"repo\":\"test-repo\",\"pull_number\":42,\"title\":\"PREQ-4242 Standalone PR\"})",
            "Invoked jira.moveIssue('PREQ-4242', 'Commit', null)",
            "Invoked jira.moveIssue('PREQ-4242', 'Start', null)",
            "Adding the following ticket as comment: PREQ-4242",
            "Invoked rest.issues.createComment({\"owner\":\"test-owner\",\"repo\":\"test-repo\",\"issue_number\":42,\"body\":\"[PREQ-4242](https://sonarsource.atlassian.net/browse/PREQ-4242)\"})",
            "Invoked jira.addIssueRemoteLink('PREQ-4242'', 'https://github.com/test-owner/test-repo/pull/42', null)",
            "Done"
        ]);
    });
    it('Normal PR cleans up title ', async () => {
        await runAction('KEY', '    GHA-1000    Useless whitespace ');
        expect(logTester.logsParams).toStrictEqual([
            "Loading PR #42",
            "Updating PR #42 title to: GHA-1000 Useless whitespace",
            "Invoked rest.pulls.update({\"owner\":\"test-owner\",\"repo\":\"test-repo\",\"pull_number\":42,\"title\":\"GHA-1000 Useless whitespace\"})",
            "Adding the following ticket as comment: GHA-1000",
            "Invoked rest.issues.createComment({\"owner\":\"test-owner\",\"repo\":\"test-repo\",\"issue_number\":42,\"body\":\"[GHA-1000](https://sonarsource.atlassian.net/browse/GHA-1000)\"})",
            "Invoked jira.addIssueRemoteLink('GHA-1000'', 'https://github.com/test-owner/test-repo/pull/42', null)",
            "Done"
        ]);
    });
    it('Normal PR with reviewer', async () => {
        await runAction('KEY', 'KEY-4242 Normal PR', null, 'test-user', [{ type: "User", login: "test-user" }]);
        expect(logTester.logsParams).toStrictEqual([
            "Loading PR #42",
            "Adding the following ticket as comment: KEY-4242",
            "Invoked rest.issues.createComment({\"owner\":\"test-owner\",\"repo\":\"test-repo\",\"issue_number\":42,\"body\":\"[KEY-4242](https://sonarsource.atlassian.net/browse/KEY-4242)\"})",
            "Invoked jira.addIssueRemoteLink('KEY-4242'', 'https://github.com/test-owner/test-repo/pull/42', null)",
            "Done"
        ]);
    });
    it('Normal PR with team review', async () => {
        process.env['INPUT_TEAM-REVIEW-COMPONENT'] = 'Parameter Component';
        await runAction('KEY', 'KEY-4242 Normal PR', null, 'test-user', [], [
            { name: "another-team", slug: "another-team" }, // NO OP
            { name: "platform-cloud-engineering-squad", slug: "platform-cloud-engineering-squad" }, // Requests review, queries accountId
            { name: "platform-cloud-production-engineering-squad", slug: "platform-cloud-production-engineering-squad" } // Requests review, reuses accountId
        ]);
        expect(logTester.logsParams).toStrictEqual([
            "Loading PR #42",
            "Adding the following ticket as comment: KEY-4242",
            "Invoked rest.issues.createComment({\"owner\":\"test-owner\",\"repo\":\"test-repo\",\"issue_number\":42,\"body\":\"[KEY-4242](https://sonarsource.atlassian.net/browse/KEY-4242)\"})",
            "Invoked jira.addIssueRemoteLink('KEY-4242'', 'https://github.com/test-owner/test-repo/pull/42', null)",
            "Done"
        ]);
    });
    it('Normal PR isEngXpSquad', async () => {
        process.env['INPUT_IS-ENG-XP-SQUAD'] = 'true';
        process.env['INPUT_TEAM-REVIEW-COMPONENT'] = 'Parameter Component';
        await runAction('', 'BUILD-4444 Fix normal issue');
        expect(logTester.logsParams).toStrictEqual([
            "Loading PR #42",
            "Adding the following ticket as comment: BUILD-4444",
            "Invoked rest.issues.createComment({\"owner\":\"test-owner\",\"repo\":\"test-repo\",\"issue_number\":42,\"body\":\"[BUILD-4444](https://sonarsource.atlassian.net/browse/BUILD-4444)\"})",
            "Invoked jira.addIssueRemoteLink('BUILD-4444'', 'https://github.com/test-owner/test-repo/pull/42', null)",
            "Invoked jira.createComponent('BUILD', 'test-repo', 'https://github.com/test-owner/test-repo')",
            "Invoked jira.addIssueComponent('BUILD-4444', 'test-repo')",
            "Invoked jira.createComponent('BUILD', 'Parameter Component', 'null')",
            "Invoked jira.addIssueComponent('BUILD-4444', 'Parameter Component')",
            "Done"
        ]);
    });
});
//# sourceMappingURL=PullRequestCreated.test.js.map