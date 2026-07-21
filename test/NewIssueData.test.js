import { assertEqual } from './support/Assertions.js';
import { afterEach, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert';
import { NewIssueData } from '../src/helpers/NewIssueData.js';
import { jiraClientStub } from './support/JiraClientStub.js';
import { LogTester } from './support/LogTester.js';
import { TeamReviewDataStub } from './support/TeamReviewDataStub.js';
function createPullRequest(title, body, repo = 'repo') {
  return {
    number: 42,
    title,
    body,
    base: { repo: { name: repo } },
    isRenovate() {
      return title === 'Renovate PR';
    },
    isDependabot() {
      return title === 'Dependabot PR';
    },
    isBot() {
      return title === 'Renovate PR' || title === 'Dependabot PR' || title === 'Some Other Bot PR';
    },
  };
}
function createDescription(text) {
  return text === undefined
    ? undefined
    : {
        content: [
          {
            content: [
              {
                text,
                type: 'text',
              },
            ],
            type: 'paragraph',
          },
        ],
        type: 'doc',
        version: 1,
      };
}
function createExpected(description) {
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
    projectKey: 'KEY',
  };
}
function createExpectedParent(
  projectKey,
  parent,
  issueType,
  description,
  accountId = '1234-account',
) {
  return {
    accountId,
    assigneeId: accountId,
    additionalFields: {
      // No team or sprintId for Sub-task
      customfield_10001: issueType === 'Sub-task' ? undefined : 'dot-neeet-team',
      customfield_10020: issueType === 'Sub-task' ? undefined : null,
      issuetype: { name: issueType },
      parent: parent ? { key: parent } : undefined,
      description: createDescription(description),
    },
    projectKey,
  };
}
function createExpectedWithoutAccount(description) {
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
    projectKey: 'KEY',
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
    assertEqual(
      await NewIssueData.create(
        jiraClientStub,
        createPullRequest('Title', 'Body'),
        'KEY',
        '',
        '1234-account',
        '',
      ),
      createExpected('Body'),
    );
  });
  it('create standalone PR with body null', async () => {
    assertEqual(
      await NewIssueData.create(
        jiraClientStub,
        createPullRequest('Title', null),
        'KEY',
        '',
        '1234-account',
        '',
      ),
      createExpected(undefined),
    );
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
    assertEqual(
      await NewIssueData.create(
        jiraClientStub,
        createPullRequest('Title', body),
        'KEY',
        '',
        '1234-account',
        '',
      ),
      createExpected(undefined),
    );
  });
  it('create fixed issue', async () => {
    assertEqual(
      await NewIssueData.create(
        jiraClientStub,
        createPullRequest('KEY-1234 Title', 'Body'),
        'KEY',
        '',
        '1234-account',
        '',
      ),
      createExpected('Body'),
    );
  });
  it('create projectKey parent Theme', async () => {
    assertEqual(
      await NewIssueData.create(
        jiraClientStub,
        createPullRequest('Title', 'Part of Epic THEME-42'),
        'KEY',
        '',
        '1234-account',
        '',
      ),
      createExpectedParent('KEY', 'NET-1000', 'Maintenance', 'Part of Epic THEME-42'),
    ); // NET-1000 is Evergreen fallback
  });
  it('create projectKey parent Initiative', async () => {
    assertEqual(
      await NewIssueData.create(
        jiraClientStub,
        createPullRequest('Title', 'Part of Epic MMF-1111'),
        'KEY',
        '',
        '1234-account',
        '',
      ),
      createExpectedParent('KEY', 'NET-1000', 'Maintenance', 'Part of Epic MMF-1111'),
    ); // NET-1000 is Evergreen fallback
  });
  it('create projectKey parent Epic with configured project', async () => {
    assertEqual(
      await NewIssueData.create(
        jiraClientStub,
        createPullRequest('Title', 'Part of Epic EPIC-111'),
        'KEY',
        '',
        '1234-account',
        '',
      ),
      createExpectedParent('KEY', 'EPIC-111', 'Maintenance', 'Part of Epic EPIC-111'),
    );
  });
  it('create projectKey parent Epic without configured project', async () => {
    assertEqual(
      await NewIssueData.create(
        jiraClientStub,
        createPullRequest('Title', 'Part of Epic EPIC-111'),
        '',
        '',
        '1234-account',
        '',
      ),
      createExpectedParent('EPIC', 'EPIC-111', 'Maintenance', 'Part of Epic EPIC-111'),
    );
  });
  it('create projectKey parent Issue with configured project', async () => {
    assertEqual(
      await NewIssueData.create(
        jiraClientStub,
        createPullRequest('Title', 'Part of work item KEY-1234'),
        'KEY',
        '',
        '1234-account',
        '',
      ),
      createExpectedParent('KEY', 'KEY-1234', 'Sub-task', 'Part of work item KEY-1234'),
    );
  });
  it('create projectKey parent Issue without configured project', async () => {
    assertEqual(
      await NewIssueData.create(
        jiraClientStub,
        createPullRequest('Title', 'Part of work item KEY-1234'),
        '',
        '',
        '1234-account',
        '',
      ),
      createExpectedParent('KEY', 'KEY-1234', 'Sub-task', 'Part of work item KEY-1234'),
    );
  });
  it('create projectKey parent Sub-task', async () => {
    assertEqual(
      await NewIssueData.create(
        jiraClientStub,
        createPullRequest('Title', 'Part of Sub-task KEY-5555'),
        'KEY',
        '',
        '1234-account',
        '',
      ),
      createExpectedParent('KEY', 'NET-1000', 'Maintenance', 'Part of Sub-task KEY-5555'),
    ); // NET-1000 is Evergreen fallback
  });
  it('create projectKey not configured standalone PR', async () => {
    // RSPEC repo without parent ticket
    assert.strictEqual(
      await NewIssueData.create(
        jiraClientStub,
        createPullRequest('Title', 'Body'),
        '',
        '',
        '1234-account',
        '',
      ),
      null,
    );
  });
  it('create parent Evergreen Epic is null without team', async () => {
    const expected = {
      accountId: null,
      assigneeId: null,
      additionalFields: {
        // No team, no EverGreen Epic parent
        issuetype: { name: 'Maintenance' },
        parent: null, // No Evergreen Epic
        description: createDescription('Body'),
      },
      projectKey: 'NOPROJECTLEAD',
    };
    assertEqual(
      await NewIssueData.create(
        jiraClientStub,
        createPullRequest('Title', 'Body'),
        'NOPROJECTLEAD',
        '',
        null,
        'nonexistent-fallback-team',
      ),
      expected,
    );
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
        parent: null, // No Evergreen Epic
        description: createDescription('Body'),
      },
      projectKey: 'KEY',
    };
    assertEqual(
      await NewIssueData.create(
        jiraClientStub,
        createPullRequest('Title', 'Body'),
        'KEY',
        '',
        '4444-no-epics-account',
        '',
      ),
      expected,
    );
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
        parent: { key: 'NET-1000' },
        description: createDescription('Body'),
      },
      projectKey: 'KEY',
    };
    assertEqual(
      await NewIssueData.create(
        jiraClientStub,
        createPullRequest('Title', 'Body'),
        'KEY',
        '{ "components": [ { "name": "Some Component" } ], "labels": ["SomeLabel"] }',
        '1234-account',
        '',
      ),
      expected,
    );
  });
  it('create with additional fields custom issue type', async () => {
    const expected = createExpected('Body');
    expected.additionalFields.issuetype.name = 'Custom Issue Type';
    assertEqual(
      await NewIssueData.create(
        jiraClientStub,
        createPullRequest('Title', 'Body'),
        'KEY',
        '{ "issuetype": { "name": "Custom Issue Type" } }',
        '1234-account',
        '',
      ),
      expected,
    );
  });
  it('create renovate ignores parent', async () => {
    assertEqual(
      await NewIssueData.create(
        jiraClientStub,
        createPullRequest('Renovate PR', 'FOREIGN-1234 and NET-1111'),
        'KEY',
        '',
        null,
        '',
      ),
      createExpectedWithoutAccount('FOREIGN-1234 and NET-1111'),
    );
  });
  it('create dependabot ignores parent', async () => {
    assertEqual(
      await NewIssueData.create(
        jiraClientStub,
        createPullRequest('Dependabot PR', 'FOREIGN-1234 and NET-1111'),
        'KEY',
        '',
        null,
        '',
      ),
      createExpectedWithoutAccount('FOREIGN-1234 and NET-1111'),
    );
  });
  it('create non-Renovate non-Dependabot bot resolves parent', async () => {
    // GHA-322: Vault-based bot PRs (e.g. hashicorp-vault-sonar-prod[bot]) are not release-note bots, so the parent must be resolved from the PR body.
    assertEqual(
      await NewIssueData.create(
        jiraClientStub,
        createPullRequest('Some Other Bot PR', 'Part of work item KEY-1234'),
        'KEY',
        '',
        null,
        '',
      ),
      createExpectedParent('KEY', 'KEY-1234', 'Sub-task', 'Part of work item KEY-1234', null),
    );
  });
  it('create with fallbackTeam valid', async () => {
    const expected = {
      accountId: null,
      assigneeId: null,
      additionalFields: {
        customfield_10001: 'fallback-team',
        customfield_10020: 42,
        issuetype: { name: 'Maintenance' },
        parent: null, // No Evergreen Epic
        description: createDescription('Body'),
      },
      projectKey: 'KEY',
    };
    assertEqual(
      await NewIssueData.create(
        jiraClientStub,
        createPullRequest('Renovate PR', 'Body'),
        'KEY',
        '',
        null,
        'fallback-team',
      ),
      expected,
    );
  });
  it('create with fallbackTeam nonexistent', async () => {
    assertEqual(
      await NewIssueData.create(
        jiraClientStub,
        createPullRequest('Renovate PR', 'Body'),
        'KEY',
        '',
        null,
        'nonexistent-fallback-team',
      ),
      createExpectedWithoutAccount('Body'),
    );
  });
  it('create with project lead team', async () => {
    assertEqual(
      await NewIssueData.create(
        jiraClientStub,
        createPullRequest('Renovate PR', 'Body'),
        'KEY',
        '',
        null,
        '',
      ),
      createExpectedWithoutAccount('Body'),
    );
  });
  it('create with SC without fallback', async () => {
    const expected = {
      accountId: null,
      assigneeId: null,
      additionalFields: {
        customfield_10001: '772ea1dc-3574-42bc-a378-7a898d910ebd',
        customfield_10020: 42,
        issuetype: { name: 'Maintenance' },
        parent: { key: 'SC-3333' },
        description: createDescription('Body'),
      },
      projectKey: 'SC',
    };
    assertEqual(
      await NewIssueData.create(
        jiraClientStub,
        createPullRequest('Renovate PR', 'Body'),
        'SC',
        '',
        null,
        '',
      ),
      expected,
    );
  });
  it('createForTeamReview', async () => {
    assertEqual(
      await NewIssueData.createForTeamReview(
        jiraClientStub,
        TeamReviewDataStub.createCloudEngineering('1234-account', '5000-assignee'),
      ),
      {
        accountId: '1234-account',
        assigneeId: '5000-assignee',
        additionalFields: {
          customfield_10001: '772ea1dc-3574-42bc-a378-7a898d910ebd',
          issuetype: { name: 'Maintenance' },
          labels: ['preq-review-code'],
          parent: { key: 'SC-1000' },
          reporter: { id: '1234-account' },
        },
        projectKey: 'PREQ',
      },
    );
  });
  it('createForTeamReview with null accountId', async () => {
    assertEqual(
      await NewIssueData.createForTeamReview(
        jiraClientStub,
        TeamReviewDataStub.createCloudEngineering(null, null),
      ),
      {
        accountId: null,
        assigneeId: null,
        additionalFields: {
          customfield_10001: '772ea1dc-3574-42bc-a378-7a898d910ebd',
          issuetype: { name: 'Maintenance' },
          labels: ['preq-review-code'],
          parent: { key: 'SC-1000' },
        },
        projectKey: 'PREQ',
      },
    );
  });
  it('create with no team', async () => {
    const expected = {
      accountId: null,
      assigneeId: null,
      additionalFields: {
        // No team, no sprint
        issuetype: { name: 'Maintenance' },
        parent: null, // No Evergreen Epic
        description: createDescription('Body'),
      },
      projectKey: 'NOTEAM',
    };
    assertEqual(
      await NewIssueData.create(
        jiraClientStub,
        createPullRequest('Renovate PR', 'Body'),
        'NOTEAM',
        '',
        null,
        '',
      ),
      expected,
    );
  });
  it('createForEngExp internal contributor', async () => {
    const expected = {
      accountId: '3333-eng-exp-account',
      assigneeId: '3333-eng-exp-account',
      additionalFields: {
        customfield_10001: 'eb40f25e-3596-4541-b661-cf83e7bc4fa6',
        customfield_10020: 42,
        issuetype: { name: 'Maintenance' },
        parent: { key: 'BUILD-1000' },
        labels: ['dvi-created-by-automation'],
        reporter: { id: '3333-eng-exp-account' },
        description: createDescription('Body'),
      },
      projectKey: 'BUILD',
    };
    assertEqual(
      await NewIssueData.createForEngExp(
        jiraClientStub,
        createPullRequest('Title', 'Body'),
        '3333-eng-exp-account',
      ),
      expected,
    );
  });
  it('createForEngExp external contributor', async () => {
    const expected = {
      accountId: '1234-account',
      assigneeId: null,
      additionalFields: {
        customfield_10001: 'eb40f25e-3596-4541-b661-cf83e7bc4fa6',
        issuetype: { name: 'Maintenance' },
        labels: ['dvi-created-by-automation'],
        reporter: { id: '1234-account' },
        description: createDescription('Body'),
      },
      projectKey: 'PREQ',
    };
    assertEqual(
      await NewIssueData.createForEngExp(
        jiraClientStub,
        createPullRequest('Title', 'Body'),
        '1234-account',
      ),
      expected,
    );
  });
  it('createForEngExp renovate', async () => {
    const expected = {
      accountId: null,
      assigneeId: null,
      additionalFields: {
        customfield_10001: 'eb40f25e-3596-4541-b661-cf83e7bc4fa6',
        issuetype: { name: 'Maintenance' },
        parent: { key: 'BUILD-1000' },
        labels: ['dvi-created-by-automation', 'dvi-renovate'],
        description: createDescription('Body'),
      },
      projectKey: 'BUILD',
    };
    assertEqual(
      await NewIssueData.createForEngExp(
        jiraClientStub,
        createPullRequest('Renovate PR', 'Body'),
        null,
      ),
      expected,
    );
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
        reporter: { id: '1234-account' },
        description: createDescription('Body'),
      },
      projectKey: 'PARENTOSS',
    };
    assertEqual(
      await NewIssueData.createForEngExp(
        jiraClientStub,
        createPullRequest('Title', 'Body', 'parent-oss'),
        '1234-account',
      ),
      expected,
    );
  });
});
