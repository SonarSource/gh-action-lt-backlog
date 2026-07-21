import { afterEach, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert';
import { LogTester } from './support/LogTester.js';
import { createOctokitRestStub } from './support/OctokitRestStub.js';
import { PullRequestAction } from '../src/helpers/PullRequestAction.js';
class TestPullRequestAction extends PullRequestAction {
  constructor(title, login = 'test-user') {
    super();
    this.rest = createOctokitRestStub(title, null, login);
    this.payload = {
      pull_request: {
        number: 42,
        title,
        created_at: '2024-12-24T11:00:00Z',
        updated_at: '2024-12-24T22:33:44Z', // By default, these are requests send later after PR creation
        user: {
          login,
          type: login.endsWith('[bot]') ? 'Bot' : 'User',
        },
      },
    };
  }
  async processJiraIssue(pr, issueId) {
    this.log(`Invoked processJiraIssue(${issueId})`);
  }
}
function createSutFromPrCreationEvent(title, login = 'test-user') {
  const sut = new TestPullRequestAction(title, login);
  sut.payload.pull_request.updated_at = sut.payload.pull_request.created_at; // This event was triggered from PR creation itself (with reviewer for example)
  return sut;
}
describe('PullRequestAction', () => {
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
  });
  afterEach(() => {
    logTester?.afterEach(); // When beforeAll fails, beforeEach is not called, but afterEach is.
  });
  it('No issue ID', async () => {
    const sut = new TestPullRequestAction('Standalone PR');
    await sut.run();
    assert.deepStrictEqual(logTester.logsParams, ['No Jira issue found in the PR title.', 'Done']);
  });
  it('Process all title issue IDs', async () => {
    const sut = new TestPullRequestAction(
      'GHA-42, [GHA-43] And also SCAN4NET-44 with number in project key, but no lowercase-22',
    );
    await sut.run();
    assert.deepStrictEqual(logTester.logsParams, [
      'Loading PR #42',
      'Invoked processJiraIssue(GHA-42)',
      'Invoked processJiraIssue(GHA-43)',
      'Invoked processJiraIssue(SCAN4NET-44)',
      'Done',
    ]);
  });
  it('Process renovate issue ID', async () => {
    const sut = new TestPullRequestAction('Renovate PR with ID in comment', 'renovate[bot]');
    sut.rest.issues.listComments = function (params) {
      return {
        data: [{ body: 'Renovate Jira issue ID: GHA-42' }],
      };
    };
    await sut.run();
    assert.deepStrictEqual(logTester.logsParams, [
      'Loading PR #42',
      'Invoked processJiraIssue(GHA-42)',
      'Done',
    ]);
  });
  it('Ignore BUILD and PREQ', async () => {
    const sut = new TestPullRequestAction(
      'GHA-42 is processed but BUILD-42 and PREQ-43 are ignored',
    );
    await sut.run();
    assert.deepStrictEqual(logTester.logsParams, [
      'Loading PR #42',
      'Invoked processJiraIssue(GHA-42)',
      'Skipping BUILD-42',
      'Skipping PREQ-43',
      'Done',
    ]);
  });
  it('Process BUILD and PREQ for is-eng-xp-squad', async () => {
    const sut = new TestPullRequestAction('BUILD-42 and PREQ-43 are processed');
    sut.isEngXpSquad = true;
    await sut.run();
    assert.deepStrictEqual(logTester.logsParams, [
      'Loading PR #42',
      'Invoked processJiraIssue(BUILD-42)',
      'Invoked processJiraIssue(PREQ-43)',
      'Done',
    ]);
  });
  // PR is created with reviewer, both PullRequestCreated and RequestReview are triggered.
  describe('PR created with reviewer', () => {
    it('Normal PR', async () => {
      const sut = createSutFromPrCreationEvent('GHA-42 Normal PR');
      await sut.run();
      assert.deepStrictEqual(logTester.logsParams, [
        'Loading PR #42',
        'Invoked processJiraIssue(GHA-42)',
        'Done',
      ]);
    });
    it('Standalone PR, PullRequestCreated did not run yet', async () => {
      const sut = createSutFromPrCreationEvent('Standalone PR');
      await sut.run();
      assert.deepStrictEqual(logTester.logsParams, [
        'No Jira issue found in the PR title.',
        'Done',
      ]);
    });
    it('Standalone PR, PullRequestCreated already updated PR title', async () => {
      const sut = createSutFromPrCreationEvent('GHA-42 Standalone PR');
      sut.payload.pull_request.title = 'Standalone PR'; // While REST api will already return the updated title, the payload contains the original one
      await sut.run();
      assert.deepStrictEqual(logTester.logsParams, [
        'No Jira issue found in the PR title.',
        'Done',
      ]);
    });
    it('Renovate PR, PullRequestCreated did not run yet', async () => {
      const sut = createSutFromPrCreationEvent('Renovate PR', 'renovate[bot]');
      await sut.run();
      assert.deepStrictEqual(logTester.logsParams, [
        'No Jira issue found in the PR title.',
        'Done',
      ]);
    });
    it('Renovate PR, PullRequestCreated already added issue ID as comment', async () => {
      const sut = createSutFromPrCreationEvent('Renovate PR', 'renovate[bot]');
      sut.rest.issues.listComments = function (params) {
        return {
          data: [{ body: 'Renovate Jira issue ID: GHA-42' }],
        };
      };
      await sut.run();
      assert.deepStrictEqual(logTester.logsParams, [
        'No Jira issue found in the PR title.',
        'Done',
      ]);
    });
  });
});
