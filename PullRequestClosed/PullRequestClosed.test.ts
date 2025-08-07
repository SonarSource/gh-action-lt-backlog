import * as github from '@actions/github';
import { PullRequestClosed } from './PullRequestClosed';
import { LogTester } from '../tests/LogTester';
import { jiraClientStub } from '../tests/JiraClientStub';
import { createOctokitRestStub } from '../tests/OctokitRestStub';


async function runAction(jiraProject: string, title: string, body?: string, user: string = 'test-user') {
  process.env['INPUT_JIRA-PROJECT'] = jiraProject;
  const action = new PullRequestClosed();
  (action as any).jira = jiraClientStub;
  (action as any).rest = createOctokitRestStub(title, body, user);
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
    await runAction('KEY', 'KEY-1234 Title');
    expect(logTester.logsParams).toStrictEqual([
      "Loading PR #42",
      "Loading PR #42",
      "Skipping issue resolution for non-Bot PR",
      "Done"
    ]);
  });

  it('is-eng-xp-squad Bot PR resolves issue', async () => {
    process.env['INPUT_IS-ENG-XP-SQUAD'] = 'true';
    await runAction('KEY', 'Title', null, "renovate[bot]");
    expect(logTester.logsParams).toStrictEqual([
      "Loading PR #42",
      "Loading PR #42",
      "Invoked jira.moveIssue('KEY-1234', 'Resolve issue', {\"resolution\":{\"id\":\"10001\"}})",
      "Done",
    ]);
  });

  it('PR closed by custom creator', async () => {
    await runAction('KEY', 'KEY-1234 Title');
    expect(logTester.logsParams).toStrictEqual([
      "Loading PR #42",
      "Skipping issue cancellation for creator CreatorKEY1234",
      "Done"
    ]);
  });

  it('PR closed by Jira Tech User GitHub creator', async () => {
    await runAction('KEY', 'KEY-5678 Title');
    expect(logTester.logsParams).toStrictEqual([
      "Loading PR #42",
      "Invoked jira.moveIssue('KEY-5678', 'Cancel Issue', {\"resolution\":{\"id\":\"10001\"}})",
      "Done"
    ]);
  });

  it('PR merged on release branch', async () => {
    github.context.payload.pull_request.merged = true;
    github.context.payload.pull_request.base = { ref: 'master'};
    await runAction('KEY', 'KEY-1234 Title');
    expect(logTester.logsParams).toStrictEqual([
      "Loading PR #42",
      "KEY-1234: Executing 'MergeMaster' (10000) transition",
      "Done",
    ]);
  });

  it('PR merged on normal branch', async () => {
    github.context.payload.pull_request.merged = true;
    github.context.payload.pull_request.base = { ref: 'user/branch' };
    await runAction('KEY', 'KEY-1234 Title');
    expect(logTester.logsParams).toStrictEqual([
      "Loading PR #42",
      "KEY-1234: Executing 'MergeBranch' (10001) transition",
      "Done",
    ]);
  });
});

