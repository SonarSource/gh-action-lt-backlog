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

import { expect } from 'expect';
import { NewIssueData } from '../lib/NewIssueData';
import { PullRequest } from './OctokitTypes';
import { jiraClientStub } from '../tests/JiraClientStub';
import { LogTester } from '../tests/LogTester';

function createPullRequest(title: string, body: string, repo: string = 'repo'): PullRequest {
  return {
    number: 42,
    title,
    body,
    base: { repo: { name: repo } },
    isRenovate(): boolean { return title === 'Renovate PR' },
    isDependabot(): boolean { return title === 'Dependabot PR' }
  } as unknown as PullRequest;
}

function createExpected(): NewIssueData {
  return {
    accountId: '1234-account',
    assigneeId: '1234-account',
    additionalFields: {
      customfield_10001: 'dot-neeet-team',
      customfield_10020: 42,
      issuetype: { name: 'Task' }
    },
    projectKey: 'KEY'
  };
}

function createExpectedWithoutAccount(): NewIssueData {
  return {
    accountId: null,
    assigneeId: null,
    additionalFields: {
      customfield_10001: 'dot-neeet-team',
      customfield_10020: 42,
      issuetype: { name: 'Task' }
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
    logTester.afterEach();
  });

  it('create standalone PR', async () => {
    expect(await NewIssueData.create(jiraClientStub, createPullRequest('Title', 'Body'), 'KEY', '', 'user@sonarsource.com', '')).toEqual(createExpected());
  });

  it('create standalone PR with body null', async () => {
    expect(await NewIssueData.create(jiraClientStub, createPullRequest('Title', null), 'KEY', '', 'user@sonarsource.com', '')).toEqual(createExpected());
  });

  it('create fixed issue', async () => {
    expect(await NewIssueData.create(jiraClientStub, createPullRequest('KEY-1234 Title', 'Body'), 'KEY', '', 'user@sonarsource.com', '')).toEqual(createExpected());
  });

  it('create projectKey parent Epic MMF', async () => {
    const expected: NewIssueData = {
      accountId: '1234-account',
      assigneeId: '1234-account',
      additionalFields: {
        customfield_10001: 'dot-neeet-team',
        customfield_10020: 42,
        issuetype: { name: 'Task' },
        parent: { key: 'MMF-1111' },
      },
      projectKey: 'KEY'
    };
    expect(await NewIssueData.create(jiraClientStub, createPullRequest('Title', 'Part of Epic MMF-1111'), 'KEY', '', 'user@sonarsource.com', '')).toEqual(expected);
  });

  it('create projectKey parent Epic project', async () => {
    const expected: NewIssueData = {
      accountId: '1234-account',
      assigneeId: '1234-account',
      additionalFields: {
        customfield_10001: 'dot-neeet-team',
        customfield_10020: 42,
        issuetype: { name: 'Task' },
        parent: { key: 'KEY-1111' },
      },
      projectKey: 'KEY'
    };
    expect(await NewIssueData.create(jiraClientStub, createPullRequest('Title', 'Part of Epic KEY-1111'), 'KEY', '', 'user@sonarsource.com', '')).toEqual(expected);
  });

  it('create projectKey parent Sub-task', async () => {
    expect(await NewIssueData.create(jiraClientStub, createPullRequest('Title', 'Part of Sub-task KEY-5555'), 'KEY', '', 'user@sonarsource.com', '')).toEqual(createExpected());
  });

  it('create projectKey parent Issue', async () => {
    const expected: NewIssueData = {
      accountId: '1234-account',
      assigneeId: '1234-account',
      additionalFields: {
        // No team or sprint for Sub=task
        issuetype: { name: 'Sub-task' },
        parent: { key: 'KEY-1234' },
      },
      projectKey: 'KEY'
    };
    expect(await NewIssueData.create(jiraClientStub, createPullRequest('Title', 'Part of Task KEY-1234'), 'KEY', '', 'user@sonarsource.com', '')).toEqual(expected);
  });

  it('create projectKey not configured standalone PR', async () => {
    // RSPEC repo without parent ticket
    expect(await NewIssueData.create(jiraClientStub, createPullRequest('Title', 'Body'), '', '', 'user@sonarsource.com', '')).toBeNull();
  });

  it('create projectKey not configured with parent', async () => {
    const expected: NewIssueData = {
      accountId: '1234-account',
      assigneeId: '1234-account',
      additionalFields: {
        // No team or sprint for Sub-task
        issuetype: { name: 'Sub-task' },
        parent: { key: 'KEY-1234' },
      },
      projectKey: 'KEY'
    };
    expect(await NewIssueData.create(jiraClientStub, createPullRequest('Title', 'Part of Task KEY-1234'), '', '', 'user@sonarsource.com', '')).toEqual(expected);
  });

  it('create with additional fields', async () => {
    const expected: NewIssueData = {
      accountId: '1234-account',
      assigneeId: '1234-account',
      additionalFields: {
        components: [{ name: 'Some Component' }],
        customfield_10001: 'dot-neeet-team',
        customfield_10020: 42,
        labels: ['SomeLabel'],
        issuetype: { name: 'Task' }
      },
      projectKey: 'KEY'
    };
    expect(await NewIssueData.create(jiraClientStub, createPullRequest('Title', 'Body'), 'KEY', '{ "components": [ { "name": "Some Component" } ], "labels": ["SomeLabel"] }', 'user@sonarsource.com', '')).toEqual(expected);
  });

  it('create with additional fields custom issue type', async () => {
    const expected = createExpected();
    expected.additionalFields.issuetype.name = 'Custom Issue Type';
    expect(await NewIssueData.create(jiraClientStub, createPullRequest('Title', 'Body'), 'KEY', '{ "issuetype": { "name": "Custom Issue Type" } }', 'user@sonarsource.com', '')).toEqual(expected);
  });

  it('create renovate ignores parent', async () => {
    expect(await NewIssueData.create(jiraClientStub, createPullRequest('Renovate PR', 'FOREIGN-1234 and NET-1111'), 'KEY', '', 'renovate@renovate.com', '')).toEqual(createExpectedWithoutAccount());
  });

  it('create dependabot ignores parent', async () => {
    expect(await NewIssueData.create(jiraClientStub, createPullRequest('Dependabot PR', 'FOREIGN-1234 and NET-1111'), 'KEY', '', 'dependabot@dependabot.com', '')).toEqual(createExpectedWithoutAccount());
  });

  it('create with fallbackTeam valid', async () => {
    const expected: NewIssueData = {
      accountId: null,
      assigneeId: null,
      additionalFields: {
        customfield_10001: 'fallback-team',
        customfield_10020: 42,
        issuetype: { name: 'Task' }
      },
      projectKey: 'KEY'
    };
    expect(await NewIssueData.create(jiraClientStub, createPullRequest('Renovate PR', 'Body'), 'KEY', '', 'renovate@renovate.com', 'fallback-team')).toEqual(expected);
  });

  it('create with fallbackTeam nonexistent', async () => {
    expect(await NewIssueData.create(jiraClientStub, createPullRequest('Renovate PR', 'Body'), 'KEY', '', 'renovate@renovate.com', 'nonexistent-fallback-team')).toEqual(createExpectedWithoutAccount());
  });

  it('create with project lead team', async () => {
    expect(await NewIssueData.create(jiraClientStub, createPullRequest('Renovate PR', 'Body'), 'KEY', '', 'renovate@renovate.com', '')).toEqual(createExpectedWithoutAccount());
  });

  it('create with no team', async () => {
    const expected: NewIssueData = {
      accountId: null,
      assigneeId: null,
      additionalFields: {
        // No team, no sprint
        issuetype: { name: 'Task' }
      },
      projectKey: 'NOTEAM'
    };
    expect(await NewIssueData.create(jiraClientStub, createPullRequest('Renovate PR', 'Body'), 'NOTEAM', '', 'renovate@renovate.com', '')).toEqual(expected);
  });

  it('createForEngExp internal contributor', async () => {
    const expected: NewIssueData = {
      accountId: '3333-eng-exp-account',
      assigneeId: '3333-eng-exp-account',
      additionalFields: {
        customfield_10001: 'eb40f25e-3596-4541-b661-cf83e7bc4fa6',
        customfield_10020: 42,
        issuetype: { name: 'Task' },
        labels: ['dvi-created-by-automation'],
        reporter: { id: '3333-eng-exp-account' }
      },
      projectKey: 'BUILD'
    };
    expect(await NewIssueData.createForEngExp(jiraClientStub, createPullRequest('Title', 'Body'), 'eng.exp@sonarsource.com')).toEqual(expected);
  });

  it('createForEngExp external contributor', async () => {
    const expected: NewIssueData = {
      accountId: '1234-account',
      assigneeId: null,
      additionalFields: {
        customfield_10001: 'eb40f25e-3596-4541-b661-cf83e7bc4fa6',
        issuetype: { name: 'Task' },
        labels: ['dvi-created-by-automation'],
        reporter: { id: '1234-account' }
      },
      projectKey: 'PREQ'
    };
    expect(await NewIssueData.createForEngExp(jiraClientStub, createPullRequest('Title', 'Body'), 'user@sonarsource.com')).toEqual(expected);
  });

  it('createForEngExp renovate', async () => {
    const expected: NewIssueData = {
      accountId: null,
      assigneeId: null,
      additionalFields: {
        customfield_10001: 'eb40f25e-3596-4541-b661-cf83e7bc4fa6',
        issuetype: { name: 'Task' },
        labels: ['dvi-created-by-automation', 'dvi-renovate']
      },
      projectKey: 'BUILD'
    };
    expect(await NewIssueData.createForEngExp(jiraClientStub, createPullRequest('Renovate PR', 'Body'), 'renovate@renovate.com')).toEqual(expected);
  });

  it('createForEngExp parent-oss project', async () => {
    const expected: NewIssueData = {
      accountId: '1234-account',
      assigneeId: '1234-account',
      additionalFields: {
        customfield_10001: 'eb40f25e-3596-4541-b661-cf83e7bc4fa6',
        customfield_10020: 42,
        issuetype: { name: 'Task' },
        labels: ['dvi-created-by-automation'],
        reporter: { id: '1234-account' }
      },
      projectKey: 'PARENTOSS'
    };
    expect(await NewIssueData.createForEngExp(jiraClientStub, createPullRequest('Title', 'Body', 'parent-oss'), 'user@sonarsource.com')).toEqual(expected);
  });
});
