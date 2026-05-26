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
import { NewIssueData } from '../lib/NewIssueData.js';
import { jiraClientStub } from '../tests/JiraClientStub.js';
import { LogTester } from '../tests/LogTester.js';
import { TeamReviewDataStub } from '../tests/TeamReviewDataStub.js';
function createPullRequest(title, body, repo = 'repo') {
    return {
        number: 42,
        title,
        body,
        base: { repo: { name: repo } },
        isRenovate() { return title === 'Renovate PR'; },
        isBot() { return title === 'Renovate PR' || title === 'Dependabot PR'; }
    };
}
function createExpected() {
    return {
        accountId: '1234-account',
        assigneeId: '1234-account',
        additionalFields: {
            customfield_10001: 'dot-neeet-team',
            customfield_10020: null,
            issuetype: { name: 'Maintenance' },
            parent: { key: 'NET-1000' }
        },
        projectKey: 'KEY'
    };
}
function createExpectedParent(projectKey, parent, issueType) {
    return {
        accountId: '1234-account',
        assigneeId: '1234-account',
        additionalFields: {
            // No team or sprintId for Sub-task
            customfield_10001: issueType === 'Sub-task' ? undefined : 'dot-neeet-team',
            customfield_10020: issueType === 'Sub-task' ? undefined : null,
            issuetype: { name: issueType },
            parent: parent ? { key: parent } : undefined
        },
        projectKey
    };
}
function createExpectedWithoutAccount() {
    return {
        accountId: null,
        assigneeId: null,
        additionalFields: {
            customfield_10001: 'dot-neeet-team',
            customfield_10020: null,
            issuetype: { name: 'Maintenance' },
            parent: { key: 'NET-1000' }
        },
        projectKey: 'KEY'
    };
}
describe('NewIssueData', () => {
    let logTester;
    beforeEach(() => {
        logTester = new LogTester();
    });
    afterEach(() => {
        logTester?.afterEach(); // When beforeAll fails, beforeEach is not called, but afterEach is.
    });
    it('create standalone PR', async () => {
        expect(await NewIssueData.create(jiraClientStub, createPullRequest('Title', 'Body'), 'KEY', '', '1234-account', '')).toEqual(createExpected());
    });
    it('create standalone PR with body null', async () => {
        expect(await NewIssueData.create(jiraClientStub, createPullRequest('Title', null), 'KEY', '', '1234-account', '')).toEqual(createExpected());
    });
    it('create fixed issue', async () => {
        expect(await NewIssueData.create(jiraClientStub, createPullRequest('KEY-1234 Title', 'Body'), 'KEY', '', '1234-account', '')).toEqual(createExpected());
    });
    it('create projectKey parent Theme', async () => {
        expect(await NewIssueData.create(jiraClientStub, createPullRequest('Title', 'Part of Epic THEME-42'), 'KEY', '', '1234-account', '')).toEqual(createExpectedParent('KEY', "NET-1000", 'Maintenance')); // NET-1000 is Evergreen fallback
    });
    it('create projectKey parent Initiative', async () => {
        expect(await NewIssueData.create(jiraClientStub, createPullRequest('Title', 'Part of Epic MMF-1111'), 'KEY', '', '1234-account', '')).toEqual(createExpectedParent('KEY', "NET-1000", 'Maintenance')); // NET-1000 is Evergreen fallback
    });
    it('create projectKey parent Epic with configured project', async () => {
        expect(await NewIssueData.create(jiraClientStub, createPullRequest('Title', 'Part of Epic EPIC-111'), 'KEY', '', '1234-account', '')).toEqual(createExpectedParent('KEY', 'EPIC-111', 'Maintenance'));
    });
    it('create projectKey parent Epic without configured project', async () => {
        expect(await NewIssueData.create(jiraClientStub, createPullRequest('Title', 'Part of Epic EPIC-111'), '', '', '1234-account', '')).toEqual(createExpectedParent('EPIC', 'EPIC-111', 'Maintenance'));
    });
    it('create projectKey parent Issue with configured project', async () => {
        expect(await NewIssueData.create(jiraClientStub, createPullRequest('Title', 'Part of work item KEY-1234'), 'KEY', '', '1234-account', '')).toEqual(createExpectedParent('KEY', 'KEY-1234', 'Sub-task'));
    });
    it('create projectKey parent Issue without configured project', async () => {
        expect(await NewIssueData.create(jiraClientStub, createPullRequest('Title', 'Part of work item KEY-1234'), '', '', '1234-account', '')).toEqual(createExpectedParent('KEY', 'KEY-1234', 'Sub-task'));
    });
    it('create projectKey parent Sub-task', async () => {
        expect(await NewIssueData.create(jiraClientStub, createPullRequest('Title', 'Part of Sub-task KEY-5555'), 'KEY', '', '1234-account', '')).toEqual(createExpectedParent('KEY', 'NET-1000', 'Maintenance')); // NET-1000 is Evergreen fallback
    });
    it('create projectKey not configured standalone PR', async () => {
        // RSPEC repo without parent ticket
        expect(await NewIssueData.create(jiraClientStub, createPullRequest('Title', 'Body'), '', '', '1234-account', '')).toBeNull();
    });
    it('create parent Evergreen Epic is null without team', async () => {
        const expected = {
            accountId: null,
            assigneeId: null,
            additionalFields: {
                // No team, no EverGreen Epic parent
                issuetype: { name: 'Maintenance' },
                parent: null // No Evergreen Epic
            },
            projectKey: 'NOPROJECTLEAD'
        };
        expect(await NewIssueData.create(jiraClientStub, createPullRequest('Title', 'Body'), 'NOPROJECTLEAD', '', null, 'nonexistent-fallback-team')).toEqual(expected);
    });
    it('create parent Evergreen Epic is null without epics', async () => {
        const expected = {
            accountId: '4444-no-epics-account',
            assigneeId: '4444-no-epics-account',
            additionalFields: {
                // No parent, this team does not have epics
                customfield_10001: 'no-epics-team',
                customfield_10020: null,
                issuetype: { name: 'Maintenance' },
                parent: null // No Evergreen Epic
            },
            projectKey: 'KEY'
        };
        expect(await NewIssueData.create(jiraClientStub, createPullRequest('Title', 'Body'), 'KEY', '', '4444-no-epics-account', '')).toEqual(expected);
    });
    it('create with additional fields', async () => {
        const expected = {
            accountId: '1234-account',
            assigneeId: '1234-account',
            additionalFields: {
                components: [{ name: 'Some Component' }],
                customfield_10001: 'dot-neeet-team',
                customfield_10020: null,
                labels: ['SomeLabel'],
                issuetype: { name: 'Maintenance' },
                parent: { key: 'NET-1000' }
            },
            projectKey: 'KEY'
        };
        expect(await NewIssueData.create(jiraClientStub, createPullRequest('Title', 'Body'), 'KEY', '{ "components": [ { "name": "Some Component" } ], "labels": ["SomeLabel"] }', '1234-account', '')).toEqual(expected);
    });
    it('create with additional fields custom issue type', async () => {
        const expected = createExpected();
        expected.additionalFields.issuetype.name = 'Custom Issue Type';
        expect(await NewIssueData.create(jiraClientStub, createPullRequest('Title', 'Body'), 'KEY', '{ "issuetype": { "name": "Custom Issue Type" } }', '1234-account', '')).toEqual(expected);
    });
    it('create renovate ignores parent', async () => {
        expect(await NewIssueData.create(jiraClientStub, createPullRequest('Renovate PR', 'FOREIGN-1234 and NET-1111'), 'KEY', '', null, '')).toEqual(createExpectedWithoutAccount());
    });
    it('create dependabot ignores parent', async () => {
        expect(await NewIssueData.create(jiraClientStub, createPullRequest('Dependabot PR', 'FOREIGN-1234 and NET-1111'), 'KEY', '', null, '')).toEqual(createExpectedWithoutAccount());
    });
    it('create with fallbackTeam valid', async () => {
        const expected = {
            accountId: null,
            assigneeId: null,
            additionalFields: {
                customfield_10001: 'fallback-team',
                customfield_10020: 42,
                issuetype: { name: 'Maintenance' },
                parent: null // No Evergreen Epic
            },
            projectKey: 'KEY'
        };
        expect(await NewIssueData.create(jiraClientStub, createPullRequest('Renovate PR', 'Body'), 'KEY', '', null, 'fallback-team')).toEqual(expected);
    });
    it('create with fallbackTeam nonexistent', async () => {
        expect(await NewIssueData.create(jiraClientStub, createPullRequest('Renovate PR', 'Body'), 'KEY', '', null, 'nonexistent-fallback-team')).toEqual(createExpectedWithoutAccount());
    });
    it('create with project lead team', async () => {
        expect(await NewIssueData.create(jiraClientStub, createPullRequest('Renovate PR', 'Body'), 'KEY', '', null, '')).toEqual(createExpectedWithoutAccount());
    });
    it('createForPreqReview', async () => {
        expect(await NewIssueData.createForPreqReview(jiraClientStub, TeamReviewDataStub.createCloudEngineering('1234-account'))).toEqual({
            accountId: '1234-account',
            assigneeId: null,
            additionalFields: {
                customfield_10001: '772ea1dc-3574-42bc-a378-7a898d910ebd',
                issuetype: { name: 'Maintenance' },
                labels: ['preq-review-code'],
                parent: { key: 'SC-1000' },
                reporter: { id: '1234-account' }
            },
            projectKey: 'PREQ'
        });
    });
    it('createForPreqReview with null accountId', async () => {
        expect(await NewIssueData.createForPreqReview(jiraClientStub, TeamReviewDataStub.createCloudEngineering(null))).toEqual({
            accountId: null,
            assigneeId: null,
            additionalFields: {
                customfield_10001: '772ea1dc-3574-42bc-a378-7a898d910ebd',
                issuetype: { name: 'Maintenance' },
                labels: ['preq-review-code'],
                parent: { key: 'SC-1000' }
            },
            projectKey: 'PREQ'
        });
    });
    it('create with no team', async () => {
        const expected = {
            accountId: null,
            assigneeId: null,
            additionalFields: {
                // No team, no sprint
                issuetype: { name: 'Maintenance' },
                parent: null // No Evergreen Epic
            },
            projectKey: 'NOTEAM'
        };
        expect(await NewIssueData.create(jiraClientStub, createPullRequest('Renovate PR', 'Body'), 'NOTEAM', '', null, '')).toEqual(expected);
    });
    it('createForEngExp internal contributor', async () => {
        const expected = {
            accountId: '3333-eng-exp-account',
            assigneeId: '3333-eng-exp-account',
            additionalFields: {
                customfield_10001: 'eb40f25e-3596-4541-b661-cf83e7bc4fa6',
                customfield_10020: 42,
                issuetype: { name: 'Maintenance' },
                parent: { "key": "BUILD-1000" },
                labels: ['dvi-created-by-automation'],
                reporter: { id: '3333-eng-exp-account' }
            },
            projectKey: 'BUILD'
        };
        expect(await NewIssueData.createForEngExp(jiraClientStub, createPullRequest('Title', 'Body'), '3333-eng-exp-account')).toEqual(expected);
    });
    it('createForEngExp external contributor', async () => {
        const expected = {
            accountId: '1234-account',
            assigneeId: null,
            additionalFields: {
                customfield_10001: 'eb40f25e-3596-4541-b661-cf83e7bc4fa6',
                issuetype: { name: 'Maintenance' },
                labels: ['dvi-created-by-automation'],
                reporter: { id: '1234-account' }
            },
            projectKey: 'PREQ'
        };
        expect(await NewIssueData.createForEngExp(jiraClientStub, createPullRequest('Title', 'Body'), '1234-account')).toEqual(expected);
    });
    it('createForEngExp renovate', async () => {
        const expected = {
            accountId: null,
            assigneeId: null,
            additionalFields: {
                customfield_10001: 'eb40f25e-3596-4541-b661-cf83e7bc4fa6',
                issuetype: { name: 'Maintenance' },
                parent: { "key": "BUILD-1000" },
                labels: ['dvi-created-by-automation', 'dvi-renovate']
            },
            projectKey: 'BUILD'
        };
        expect(await NewIssueData.createForEngExp(jiraClientStub, createPullRequest('Renovate PR', 'Body'), null)).toEqual(expected);
    });
    it('createForEngExp parent-oss project', async () => {
        const expected = {
            accountId: '1234-account',
            assigneeId: '1234-account',
            additionalFields: {
                customfield_10001: 'eb40f25e-3596-4541-b661-cf83e7bc4fa6',
                customfield_10020: 42,
                issuetype: { name: 'Maintenance' },
                labels: ['dvi-created-by-automation'],
                reporter: { id: '1234-account' }
            },
            projectKey: 'PARENTOSS'
        };
        expect(await NewIssueData.createForEngExp(jiraClientStub, createPullRequest('Title', 'Body', 'parent-oss'), '1234-account')).toEqual(expected);
    });
});
//# sourceMappingURL=NewIssueData.test.js.map