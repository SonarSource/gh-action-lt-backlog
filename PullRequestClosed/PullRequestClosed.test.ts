import * as github from '@actions/github';
import { PullRequestClosed } from './PullRequestClosed';
import { LogTester } from '../tests/LogTester';
import { jiraClientStub } from '../tests/JiraClientStub';
import { createOctokitRestStub } from '../tests/OctokitRestStub';
import { OctokitActionStub } from '../tests/OctokitActionStub';

async function runAction(title: string, user: string = 'test-user') {
  process.env['INPUT_JIRA-PROJECT'] = 'KEY';
  const action = new PullRequestClosed() as PullRequestClosed & OctokitActionStub;
  action.jira = jiraClientStub;
  action.rest = createOctokitRestStub(title, null, user);
  if (user === "renovate[bot]") {
    (action as any).rest.issues.listComments = function () {
      return {
        data: [
          { body: "Renovate Jira issue ID: KEY-1234" }
        ]
      };
    };
  }
  await action.run();
}

describe('PullRequestClosed', () => {
  const originalKeys = Object.keys(process.env);
  let logTester: LogTester;

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
        number: 42
      }
    };
  });

  afterEach(() => {
    logTester.afterEach();
  });

  it('is-eng-xp-squad non-Bot PR skips issue resolution', async () => {
    process.env['INPUT_IS-ENG-XP-SQUAD'] = 'true';
    await runAction('KEY-1234 Title');
    expect(logTester.logsParams).toStrictEqual([
      "Loading PR #42",
      "Loading PR #42",
      "Skipping issue resolution for non-Bot PR",
      "Done"
    ]);
  });

  it('is-eng-xp-squad Bot PR merged PR moves issue to Done', async () => {
    process.env['INPUT_IS-ENG-XP-SQUAD'] = 'true';
    github.context.payload.pull_request.merged = true;
    github.context.payload.pull_request.base = { ref: 'master' };
    await runAction('Title', "renovate[bot]");
    expect(logTester.logsParams).toStrictEqual([
      "Loading PR #42",
      "Loading PR #42",
      "Invoked jira.moveIssue('KEY-1234', 'Resolve issue', {\"resolution\":{\"id\":\"10000\"}})",
      "Done",
    ]);
  });

  it('is-eng-xp-squad Bot PR unmerged PR cancels issue', async () => {
    process.env['INPUT_IS-ENG-XP-SQUAD'] = 'true';
    await runAction('Title', "renovate[bot]");
    expect(logTester.logsParams).toStrictEqual([
      "Loading PR #42",
      "Loading PR #42",
      "Invoked jira.moveIssue('KEY-1234', 'Resolve issue', {\"resolution\":{\"id\":\"10001\"}})",
      "Done",
    ]);
  });

  it('Unmerged PR for ticket created by automation is closed', async () => {
    await runAction('KEY-5678 Title');
    expect(logTester.logsParams).toStrictEqual([
      "Loading PR #42",
      "Invoked jira.moveIssue('KEY-5678', 'Cancel Issue', {\"resolution\":{\"id\":\"10001\"}})",
      "Done"
    ]);
  });

  it('Unmerged PR for pre-existing issue is closed', async () => {
    await runAction('KEY-1234 Title');
    expect(logTester.logsParams).toStrictEqual([
      "Loading PR #42",
      "Skipping issue cancellation for creator Creator of KEY-1234",
      "Done"
    ]);
  });

  it('Jira issue does not exist', async () => {
    await runAction('FAKE-1234 Title');
    expect(logTester.logsParams).toStrictEqual([
      "Loading PR #42",
      "Skipping issue cancellation for creator undefined",
      "Done"
    ]);
  });

  it('PR merged into release branch', async () => {
    const releaseBranches = ['master', 'main', 'branch-0.0.0'];
    for (const branchName of releaseBranches) {
      github.context.payload.pull_request.merged = true;
      github.context.payload.pull_request.base = { ref: branchName };
      await runAction('KEY-1234 Title');
      expect(logTester.logsParams).toStrictEqual([
        "Loading PR #42",
        "Invoked jira.transitionIssue('KEY-1234', {\"id\":\"10000\",\"name\":\"Merge into master\"}, null",
        "Done",
      ]);
      logTester.logsParams = [];
    }
  });

  it('PR merged into non-release branch', async () => {
    github.context.payload.pull_request.merged = true;
    github.context.payload.pull_request.base = { ref: 'user/branch' };
    await runAction('KEY-5678 Title');
    expect(logTester.logsParams).toStrictEqual([
      "Loading PR #42",
      "Invoked jira.transitionIssue('KEY-5678', {\"id\":\"10001\",\"name\":\"Merge into branch\"}, null",
      "Done",
    ]);
  });

  it('Merge PR for workflow without feature branches', async () => {
    github.context.payload.pull_request.merged = true;
    github.context.payload.pull_request.base = { ref: 'master' };
    await runAction('KEY-1111 Title');
    expect(logTester.logsParams).toStrictEqual([
      "Loading PR #42",
      "Invoked jira.moveIssue('KEY-1111', 'Merge', null)",
      "Done",
    ]);
  });
});

