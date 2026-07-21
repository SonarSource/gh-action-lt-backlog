import { afterEach, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert';
import * as github from '@actions/github';
import { LogTester } from '../support/LogTester.js';
import { createOctokitRestStub } from '../support/OctokitRestStub.js';
import { RequestReview } from '../../src/RequestReview.js';
import { jiraClientStub } from '../support/JiraClientStub.js';
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
        title: 'PR Title',
        created_at: '2024-12-24T11:00:00Z',
        updated_at: '2024-12-24T22:33:44Z', // By default, these are requests send later after PR creation
      },
      requested_reviewer: {
        login: 'test-user',
        type: 'User',
      },
      sender: {
        login: 'test-user',
        type: 'User',
      },
    };
  });
  afterEach(() => {
    logTester?.afterEach(); // When beforeAll fails, beforeEach is not called, but afterEach is.
  });
  // This is just a smoke test to make sure the other components works together. Details are tested in their respective classes
  it('Processes all issues in title', async () => {
    const sut = new RequestReview();
    sut.jira = jiraClientStub;
    sut.rest = createOctokitRestStub('GHA-42 and GHA-43');
    github.context.payload.pull_request.title = 'GHA-42 and GHA-43';
    sut.findEmails = async function (login) {
      return ['user@sonarsource.com'];
    };
    await sut.run();
    assert.deepStrictEqual(logTester.logsParams, [
      'Loading PR #42',
      "Invoked jira.moveIssue('GHA-42', 'Request Review', null)",
      "Invoked jira.assignIssueToEmail('GHA-42', ['user@sonarsource.com'])",
      "Invoked jira.moveIssue('GHA-43', 'Request Review', null)",
      "Invoked jira.assignIssueToEmail('GHA-43', ['user@sonarsource.com'])",
      'Done',
    ]);
  });
  it('Create platform review issue', async () => {
    github.context.payload.requested_team = {
      name: 'platform-cloud-eng-squad',
      slug: 'platform-cloud-eng-squad',
    };
    process.env['INPUT_TEAM-REVIEW-COMPONENT'] = 'Parameter Component';
    const sut = new RequestReview();
    sut.jira = jiraClientStub;
    sut.rest = createOctokitRestStub('GHA-42 Original Title');
    github.context.payload.pull_request.title = 'GHA-42 Original Title';
    sut.findEmails = async function (login) {
      return ['user@sonarsource.com'];
    };
    sut.findRootlyOnCallEmails = async function (scheduleId) {
      this.log(`Invoked findRootlyOnCallEmails("${scheduleId}")`);
      return ['teamreview.triager@sonarsource.com'];
    };
    await sut.run();
    assert.deepStrictEqual(logTester.logsParams, [
      'Loading PR #42',
      'Loading members of platform-cloud-eng-squad',
      'Invoked rest.teams.listMembersInOrg({"org":"test-owner","team_slug":"platform-cloud-eng-squad","per_page":100})',
      'Loading members of platform-cloud-prod-eng-squad',
      'Invoked rest.teams.listMembersInOrg({"org":"test-owner","team_slug":"platform-cloud-prod-eng-squad","per_page":100})',
      'Invoked findRootlyOnCallEmails("a8f6f785-aea9-4647-8200-f249dfd5fa70")',
      "Invoked jira.moveIssue('GHA-42', 'Request Review', null)",
      "Invoked jira.assignIssueToEmail('GHA-42', ['user@sonarsource.com'])",
      'Found 1 Evergreen Epic(s), using SC-1000 Current SC Review Epic platform-cloud-eng-squad',
      'Creating PREQ review issue',
      'Invoked jira.createIssue(\'PREQ\', \'PR review for GHA-42 Original Title\', {"issuetype":{"name":"Maintenance"},"reporter":{"id":"1234-account"},"customfield_10001":"772ea1dc-3574-42bc-a378-7a898d910ebd","labels":["preq-review-code"],"parent":{"key":"SC-1000"}})',
      "Invoked jira.assignIssueToAccount('PREQ-4242', '5000-teamreview-triager-account')",
      "Invoked jira.addIssueRemoteLink('PREQ-4242'', 'https://github.com/test-owner/test-repo/pull/42', null)",
      "Invoked jira.linkIssues('PREQ-4242', 'GHA-42', 'Relates')",
      'Invoked rest.issues.createComment({"owner":"test-owner","repo":"test-repo","issue_number":42,"body":"Team Review Jira issue ID: [PREQ-4242](https://sonarsource.atlassian.net/browse/PREQ-4242) platform-cloud-eng-squad\\n<!--slug: platform-cloud-eng-squad -->"})',
      "Invoked jira.createComponent('PREQ', 'Parameter Component', 'null')",
      "Invoked jira.addIssueComponent('PREQ-4242', 'Parameter Component')",
      'Done',
    ]);
  });
  // This is just a smoke test, the logic is tested in PullRequestAction
  it('Standalone PR created with reviewer', async () => {
    const sut = new RequestReview();
    sut.jira = jiraClientStub;
    sut.rest = createOctokitRestStub('Standalone PR');
    github.context.payload.pull_request.title = 'Standalone PR';
    github.context.payload.pull_request.updated_at = github.context.payload.pull_request.created_at; // PR was created with reviewer
    sut.findEmails = async function (login) {
      return ['user@sonarsource.com'];
    };
    await sut.run();
    assert.deepStrictEqual(logTester.logsParams, ['No Jira issue found in the PR title.', 'Done']);
  });
});
