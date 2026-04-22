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
import { ImportIssue } from './ImportIssue.js';
import { LogTester } from '../tests/LogTester.js';
import { jiraClientStub } from '../tests/JiraClientStub.js';
import { createOctokitRestStub } from '../tests/OctokitRestStub.js';
async function runAction(title, label) {
    process.env['INPUT_JIRA-PROJECT'] = 'GHA';
    github.context.payload = {
        issue: {
            number: 42,
            title,
            labels: [{ name: label }],
            body: 'Lorem Ipsum',
            html_url: "https://www.github.com/test-owner/test-repo/issues/42"
        }
    };
    const action = new ImportIssue();
    action.jira = jiraClientStub;
    action.rest = createOctokitRestStub(title, "Lorem Ipsum");
    await action.run();
}
describe('ImportIssue', () => {
    let logTester;
    beforeEach(() => {
        logTester = new LogTester();
        process.env['GITHUB_REPOSITORY'] = 'test-owner/test-repo';
        process.env['INPUT_GITHUB-TOKEN'] = 'fake';
    });
    afterEach(() => {
        logTester?.afterEach(); // When beforeAll fails, beforeEach is not called, but afterEach is.
    });
    it('Already imported skips the action', async () => {
        await runAction('GHA-42 Already imported', 'Irrelevant label');
        expect(logTester.logsParams).toStrictEqual(["Done"]);
    });
    it.each([
        { label: 'Bug', type: 'Bug' },
        { label: 'CFG/SE FPs', type: 'False Positive' },
        { label: 'False Negative', type: 'False Negative' },
        { label: 'False Positive', type: 'False Positive' },
        { label: 'Rule Idea', type: 'Feature' },
        { label: 'Whatever unexpected', type: 'Feature' }, // Default fallback
    ])('Import issue type from label $label => $type', async ({ label, type }) => {
        await runAction('New issue', label);
        expect(logTester.logsParams).toStrictEqual([
            "Importing #42",
            `Invoked jira.createIssue('GHA', 'New issue', {"issuetype":{"name":"${type}"},"description":{"type":"doc","version":1,"content":[{"type":"paragraph","content":[{"type":"text","text":"Lorem Ipsum"}]}]}})`,
            "Created GHA-4242",
            "Invoked jira.addIssueRemoteLink('GHA-4242'', 'https://www.github.com/test-owner/test-repo/issues/42', null)",
            "Updating issue #42 title to: GHA-4242 New issue",
            "Invoked rest.issues.update({\"owner\":\"test-owner\",\"repo\":\"test-repo\",\"issue_number\":42,\"title\":\"GHA-4242 New issue\"})",
            `Invoked jira.createComponent('GHA', '${label}', 'null')`,
            `Invoked jira.addIssueComponent('GHA-4242', '${label}')`,
            "Invoked rest.issues.createComment({\"owner\":\"test-owner\",\"repo\":\"test-repo\",\"issue_number\":42,\"body\":\"Internal ticket [GHA-4242](https://sonarsource.atlassian.net/browse/GHA-4242)\"})",
            "Done",
        ]);
    });
});
//# sourceMappingURL=ImportIssue.test.js.map