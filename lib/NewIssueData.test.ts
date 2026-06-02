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
import { PullRequest } from './OctokitTypes.js';
import { jiraClientStub } from '../tests/JiraClientStub.js';
import { LogTester } from '../tests/LogTester.js';
import { TeamReviewDataStub } from '../tests/TeamReviewDataStub.js';
import { AtlassianDocument } from './AtlassianDocumentFormat.js';

function createPullRequest(title: string, body: string | null, repo: string = 'repo'): PullRequest {
  return {
    number: 42,
    title,
    body,
    base: { repo: { name: repo } },
    isRenovate(): boolean { return title === 'Renovate PR' },
    isDependabot(): boolean { return title === 'Dependabot PR' },
    isBot(): boolean { return title === 'Renovate PR' || title === 'Dependabot PR' }
  } as unknown as PullRequest;
}

function createDescription(text: string | undefined): AtlassianDocument | undefined {
  return text === undefined ? undefined : {
    content: [
      {
        content: [
          {
            text,
            type: "text",
          },
        ],
        type: "paragraph",
      },
    ],
    type: "doc",
    version: 1,
  }
}

function createExpected(description: string | undefined): NewIssueData {
  return {
    accountId: '1234-account',
    assigneeId: '1234-account',
    additionalFields: {
      customfield_10001: 'dot-neeet-team',
      customfield_10020: null,
      issuetype: { name: 'Maintenance' },
      parent: { key: 'NET-1000' },
      description: createDescription(description),
    },
    projectKey: 'KEY'
  };
}

function createExpectedParent(projectKey: string, parent: string | null, issueType: string, description: string): NewIssueData {
  return {
    accountId: '1234-account',
    assigneeId: '1234-account',
    additionalFields: {
      // No team or sprintId for Sub-task
      customfield_10001: issueType === 'Sub-task' ? undefined : 'dot-neeet-team',
      customfield_10020: issueType === 'Sub-task' ? undefined : null,
      issuetype: { name: issueType },
      parent: parent ? { key: parent } : undefined,
      description: createDescription(description),
    },
    projectKey
  };
}

function createExpectedWithoutAccount(description: string): NewIssueData {
  return {
    accountId: null,
    assigneeId: null,
    additionalFields: {
      customfield_10001: 'dot-neeet-team',
      customfield_10020: null,
      issuetype: { name: 'Maintenance' },
      parent: { key: 'NET-1000' },
      description: createDescription(description),
    },
    projectKey: 'KEY'
  };
}

describe('NewIssueData', () => {
  let logTester: LogTester;

  beforeEach(() => {
    logTester = new LogTester();
  });

  afterEach(() => {
    logTester?.afterEach(); // When beforeAll fails, beforeEach is not called, but afterEach is.
  });

  it('create standalone PR', async () => {
    expect(await NewIssueData.create(jiraClientStub, createPullRequest('Title', 'Body'), 'KEY', '', '1234-account', '')).toEqual(createExpected('Body'));
  });

  it('create standalone PR with body null', async () => {
    expect(await NewIssueData.create(jiraClientStub, createPullRequest('Title', null), 'KEY', '', '1234-account', '')).toEqual(createExpected(undefined));
  });

  it('create standalone PR with body as default template', async () => {
    const body = `Part of 
<!-- 
  Only for standalone PRs without Jira issue in the PR title: 
    * Replace this comment with Epic ID to create a new Task in Jira
    * Replace this comment with Issue ID to create a new Sub-Task in Jira
    * Ignore or delete this note to create a new Task in Jira without a parent 
-->
`;
    expect(await NewIssueData.create(jiraClientStub, createPullRequest('Title', body), 'KEY', '', '1234-account', '')).toEqual(createExpected(undefined));
  });

  it('create fixed issue', async () => {
    expect(await NewIssueData.create(jiraClientStub, createPullRequest('KEY-1234 Title', 'Body'), 'KEY', '', '1234-account', '')).toEqual(createExpected('Body'));
  });

  it('create projectKey parent Theme', async () => {
    expect(await NewIssueData.create(jiraClientStub, createPullRequest('Title', 'Part of Epic THEME-42'), 'KEY', '', '1234-account', '')).toEqual(createExpectedParent('KEY', "NET-1000", 'Maintenance', 'Part of Epic THEME-42'));  // NET-1000 is Evergreen fallback
  });

  it('create projectKey parent Initiative', async () => {
    expect(await NewIssueData.create(jiraClientStub, createPullRequest('Title', 'Part of Epic MMF-1111'), 'KEY', '', '1234-account', '')).toEqual(createExpectedParent('KEY', "NET-1000", 'Maintenance', 'Part of Epic MMF-1111'));  // NET-1000 is Evergreen fallback
  });

  it('create projectKey parent Epic with configured project', async () => {
    expect(await NewIssueData.create(jiraClientStub, createPullRequest('Title', 'Part of Epic EPIC-111'), 'KEY', '', '1234-account', '')).toEqual(createExpectedParent('KEY', 'EPIC-111', 'Maintenance', 'Part of Epic EPIC-111'));
  });

  it('create projectKey parent Epic without configured project', async () => {
    expect(await NewIssueData.create(jiraClientStub, createPullRequest('Title', 'Part of Epic EPIC-111'), '', '', '1234-account', '')).toEqual(createExpectedParent('EPIC', 'EPIC-111', 'Maintenance', 'Part of Epic EPIC-111'));
  });

  it('create projectKey parent Issue with configured project', async () => {
    expect(await NewIssueData.create(jiraClientStub, createPullRequest('Title', 'Part of work item KEY-1234'), 'KEY', '', '1234-account', '')).toEqual(createExpectedParent('KEY', 'KEY-1234', 'Sub-task', 'Part of work item KEY-1234'));
  });

  it('create projectKey parent Issue without configured project', async () => {
    expect(await NewIssueData.create(jiraClientStub, createPullRequest('Title', 'Part of work item KEY-1234'), '', '', '1234-account', '')).toEqual(createExpectedParent('KEY', 'KEY-1234', 'Sub-task', 'Part of work item KEY-1234'));
  });

  it('create projectKey parent Sub-task', async () => {
    expect(await NewIssueData.create(jiraClientStub, createPullRequest('Title', 'Part of Sub-task KEY-5555'), 'KEY', '', '1234-account', '')).toEqual(createExpectedParent('KEY', 'NET-1000', 'Maintenance', 'Part of Sub-task KEY-5555'));  // NET-1000 is Evergreen fallback
  });

  it('create projectKey not configured standalone PR', async () => {
    // RSPEC repo without parent ticket
    expect(await NewIssueData.create(jiraClientStub, createPullRequest('Title', 'Body'), '', '', '1234-account', '')).toBeNull();
  });

  it('create parent Evergreen Epic is null without team', async () => {
    const expected: NewIssueData = {
      accountId: null,
      assigneeId: null,
      additionalFields: {
        // No team, no EverGreen Epic parent
        issuetype: { name: 'Maintenance' },
        parent: null,    // No Evergreen Epic
        description: createDescription('Body'),
      },
      projectKey: 'NOPROJECTLEAD'
    };
    expect(await NewIssueData.create(jiraClientStub, createPullRequest('Title', 'Body'), 'NOPROJECTLEAD', '', null, 'nonexistent-fallback-team')).toEqual(expected);
  });

  it('create parent Evergreen Epic is null without epics', async () => {
    const expected: NewIssueData = {
      accountId: '4444-no-epics-account',
      assigneeId: '4444-no-epics-account',
      additionalFields: {
        // No parent, this team does not have epics
        customfield_10001: 'no-epics-team',
        customfield_10020: null,
        issuetype: { name: 'Maintenance' },
        parent: null,    // No Evergreen Epic
        description: createDescription('Body'),
      },
      projectKey: 'KEY'
    };
    expect(await NewIssueData.create(jiraClientStub, createPullRequest('Title', 'Body'), 'KEY', '', '4444-no-epics-account', '')).toEqual(expected);
  });

  it('create with additional fields', async () => {
    const expected: NewIssueData = {
      accountId: '1234-account',
      assigneeId: '1234-account',
      additionalFields: {
        components: [{ name: 'Some Component' }],
        customfield_10001: 'dot-neeet-team',
        customfield_10020: null,
        labels: ['SomeLabel'],
        issuetype: { name: 'Maintenance' },
        parent: { key: 'NET-1000' },
        description: createDescription('Body'),
      },
      projectKey: 'KEY'
    };
    expect(await NewIssueData.create(jiraClientStub, createPullRequest('Title', 'Body'), 'KEY', '{ "components": [ { "name": "Some Component" } ], "labels": ["SomeLabel"] }', '1234-account', '')).toEqual(expected);
  });

  it('create with additional fields custom issue type', async () => {
    const expected = createExpected('Body');
    expected.additionalFields.issuetype.name = 'Custom Issue Type';
    expect(await NewIssueData.create(jiraClientStub, createPullRequest('Title', 'Body'), 'KEY', '{ "issuetype": { "name": "Custom Issue Type" } }', '1234-account', '')).toEqual(expected);
  });

  it('create renovate ignores parent', async () => {
    expect(await NewIssueData.create(jiraClientStub, createPullRequest('Renovate PR', 'FOREIGN-1234 and NET-1111'), 'KEY', '', null, '')).toEqual(createExpectedWithoutAccount('FOREIGN-1234 and NET-1111'));
  });

  it('create dependabot ignores parent', async () => {
    expect(await NewIssueData.create(jiraClientStub, createPullRequest('Dependabot PR', 'FOREIGN-1234 and NET-1111'), 'KEY', '', null, '')).toEqual(createExpectedWithoutAccount('FOREIGN-1234 and NET-1111'));
  });

  it('create with fallbackTeam valid', async () => {
    const expected: NewIssueData = {
      accountId: null,
      assigneeId: null,
      additionalFields: {
        customfield_10001: 'fallback-team',
        customfield_10020: 42,
        issuetype: { name: 'Maintenance' },
        parent: null,    // No Evergreen Epic
        description: createDescription('Body'),
      },
      projectKey: 'KEY'
    };
    expect(await NewIssueData.create(jiraClientStub, createPullRequest('Renovate PR', 'Body'), 'KEY', '', null, 'fallback-team')).toEqual(expected);
  });

  it('create with fallbackTeam nonexistent', async () => {
    expect(await NewIssueData.create(jiraClientStub, createPullRequest('Renovate PR', 'Body'), 'KEY', '', null, 'nonexistent-fallback-team')).toEqual(createExpectedWithoutAccount('Body'));
  });

  it('create with project lead team', async () => {
    expect(await NewIssueData.create(jiraClientStub, createPullRequest('Renovate PR', 'Body'), 'KEY', '', null, '')).toEqual(createExpectedWithoutAccount('Body'));
  });

  it('create with SC without fallback', async () => {
    const expected: NewIssueData = {
      accountId: null,
      assigneeId: null,
      additionalFields: {
        customfield_10001: '772ea1dc-3574-42bc-a378-7a898d910ebd',
        customfield_10020: 42,
        issuetype: { name: 'Maintenance' },
        parent: { key: 'SC-3333' },
        description: createDescription('Body'),
      },
      projectKey: 'SC'
    };
    expect(await NewIssueData.create(jiraClientStub, createPullRequest('Renovate PR', 'Body'), 'SC', '', null, '')).toEqual(expected);
  });

  it('createForTeamReview', async () => {
    expect(await NewIssueData.createForTeamReview(jiraClientStub, TeamReviewDataStub.createCloudEngineering('1234-account', '5000-assignee'))).toEqual({
      accountId: '1234-account',
      assigneeId: '5000-assignee',
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

  it('createForTeamReview with null accountId', async () => {
    expect(await NewIssueData.createForTeamReview(jiraClientStub, TeamReviewDataStub.createCloudEngineering(null, null))).toEqual({
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
    const expected: NewIssueData = {
      accountId: null,
      assigneeId: null,
      additionalFields: {
        // No team, no sprint
        issuetype: { name: 'Maintenance' },
        parent: null,    // No Evergreen Epic
        description: createDescription('Body'),
      },
      projectKey: 'NOTEAM'
    };
    expect(await NewIssueData.create(jiraClientStub, createPullRequest('Renovate PR', 'Body'), 'NOTEAM', '', null, '')).toEqual(expected);
  });

  it('createForEngExp internal contributor', async () => {
    const expected: NewIssueData = {
      accountId: '3333-eng-exp-account',
      assigneeId: '3333-eng-exp-account',
      additionalFields: {
        customfield_10001: 'eb40f25e-3596-4541-b661-cf83e7bc4fa6',
        customfield_10020: 42,
        issuetype: { name: 'Maintenance' },
        parent: { "key": "BUILD-1000" },
        labels: ['dvi-created-by-automation'],
        reporter: { id: '3333-eng-exp-account' },
        description: createDescription('Body'),
      },
      projectKey: 'BUILD'
    };
    expect(await NewIssueData.createForEngExp(jiraClientStub, createPullRequest('Title', 'Body'), '3333-eng-exp-account')).toEqual(expected);
  });

  it('createForEngExp external contributor', async () => {
    const expected: NewIssueData = {
      accountId: '1234-account',
      assigneeId: null,
      additionalFields: {
        customfield_10001: 'eb40f25e-3596-4541-b661-cf83e7bc4fa6',
        issuetype: { name: 'Maintenance' },
        labels: ['dvi-created-by-automation'],
        reporter: { id: '1234-account' },
        description: createDescription('Body'),
      },
      projectKey: 'PREQ'
    };
    expect(await NewIssueData.createForEngExp(jiraClientStub, createPullRequest('Title', 'Body'), '1234-account')).toEqual(expected);
  });

  it('createForEngExp renovate', async () => {
    const expected: NewIssueData = {
      accountId: null,
      assigneeId: null,
      additionalFields: {
        customfield_10001: 'eb40f25e-3596-4541-b661-cf83e7bc4fa6',
        issuetype: { name: 'Maintenance' },
        parent: { "key": "BUILD-1000" },
        labels: ['dvi-created-by-automation', 'dvi-renovate'],
        description: createDescription('Body'),
      },
      projectKey: 'BUILD'
    };
    expect(await NewIssueData.createForEngExp(jiraClientStub, createPullRequest('Renovate PR', 'Body'), null)).toEqual(expected);
  });

  it('createForEngExp parent-oss project', async () => {
    const expected: NewIssueData = {
      accountId: '1234-account',
      assigneeId: '1234-account',
      additionalFields: {
        customfield_10001: 'eb40f25e-3596-4541-b661-cf83e7bc4fa6',
        customfield_10020: 42,
        issuetype: { name: 'Maintenance' },
        labels: ['dvi-created-by-automation'],
        reporter: { id: '1234-account' },
        description: createDescription('Body'),
      },
      projectKey: 'PARENTOSS'
    };
    expect(await NewIssueData.createForEngExp(jiraClientStub, createPullRequest('Title', 'Body', 'parent-oss'), '1234-account')).toEqual(expected);
  });
});
