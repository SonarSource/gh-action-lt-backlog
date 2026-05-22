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
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as github from '@actions/github';
import { LogTester } from '../tests/LogTester.js';
import { createOctokitRestStub } from '../tests/OctokitRestStub.js';
import { RequestReview } from './RequestReview.js';
import { jiraClientStub } from '../tests/JiraClientStub.js';
describe('RequestReview', () => {
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
            },
            requested_reviewer: {
                login: "test-user",
                type: "User",
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
    // This is just a smoke test to make sure the other components works together. Details are tested in their respective classes
    it('Processes all issues in title', async () => {
        const sut = new RequestReview();
        sut.jira = jiraClientStub;
        sut.rest = createOctokitRestStub("GHA-42 and GHA-43");
        sut.findEmails = async function (login) {
            return ["user@sonarsource.com"];
        };
        await sut.run();
        expect(logTester.logsParams).toStrictEqual([
            "Loading PR #42",
            "Invoked jira.moveIssue('GHA-42', 'Request Review', null)",
            "Invoked jira.assignIssueToEmail('GHA-42', ['user@sonarsource.com'])",
            "Invoked jira.moveIssue('GHA-43', 'Request Review', null)",
            "Invoked jira.assignIssueToEmail('GHA-43', ['user@sonarsource.com'])",
            "Done",
        ]);
    });
    it('Create platform review issue', async () => {
        github.context.payload.requested_team = { name: 'platform-cloud-eng-squad' };
        const sut = new RequestReview();
        sut.jira = jiraClientStub;
        sut.rest = createOctokitRestStub("GHA-42 Original Title");
        sut.findEmails = async function (login) {
            return ["user@sonarsource.com"];
        };
        await sut.run();
        expect(logTester.logsParams).toStrictEqual([
            "Loading PR #42",
            "Invoked jira.moveIssue('GHA-42', 'Request Review', null)",
            "Invoked jira.assignIssueToEmail('GHA-42', ['user@sonarsource.com'])",
            "Found 1 Evergreen Epic(s), using SC-1000 Current SC Review Epic platform-cloud-eng-squad",
            "Creating PREQ review issue",
            "Invoked jira.createIssue('PREQ', 'PR review for GHA-42 Original Title', {\"issuetype\":{\"name\":\"Maintenance\"},\"reporter\":{\"id\":\"1234-account\"},\"customfield_10001\":\"772ea1dc-3574-42bc-a378-7a898d910ebd\",\"labels\":[\"preq-review-code\"],\"parent\":{\"key\":\"SC-1000\"}})",
            "Invoked jira.addIssueRemoteLink('PREQ-4242'', 'https://github.com/test-owner/test-repo/pull/42', null)",
            "Invoked jira.linkIssues('PREQ-4242', 'GHA-42', 'Relates')",
            "Invoked rest.issues.createComment({\"owner\":\"test-owner\",\"repo\":\"test-repo\",\"issue_number\":42,\"body\":\"Team Review Jira issue ID: [PREQ-4242](https://sonarsource.atlassian.net/browse/PREQ-4242) platform-cloud-eng-squad\"})",
            "Done",
        ]);
    });
});
//# sourceMappingURL=RequestReview.test.js.map