import * as github from '@actions/github';
import { PullRequestClosed } from './PullRequestClosed';
import { LogTester } from '../tests/LogTester';
import { jiraClientStub } from '../tests/JiraClientStub';
import { createOctokitRestStub } from '../tests/OctokitRestStub';

class TestPullRequestClosed extends PullRequestClosed {
  protected async findEmail(login: string): Promise<string> {
    switch (login) {
      case 'test-user': return 'user@sonarsource.com';
      case 'renovate[bot]': return null;
      default: throw new Error(`Scaffolding did not expect login ${login}`);
    }
  }
}

async function runAction(jiraProject: string, title: string, body?: string, user: string = 'test-user') {
  process.env['INPUT_JIRA-PROJECT'] = jiraProject;
  const action = new TestPullRequestClosed();
  (action as any).jira = jiraClientStub;
  (action as any).rest = createOctokitRestStub(title, body, user);
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
        number: 42,
        title: 'KEY-4444 Title'
      },
      repository: {
        html_url: "https://github.com/test-owner/test-repo",
        name: 'test-repo',
        owner: null
      },
      sender: {
        login: 'test-user',
        type: "User"
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
  //  github.context.payload.pull_request.user = { type:'Bot' };
    await runAction('KEY', 'KEY-1234 Title', null, 'renovate[bot]');
    expect(logTester.logsParams).toStrictEqual([
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
    github.context.payload.pull_request.base = { ref: 'mary-in-pain' };
    await runAction('KEY', 'KEY-1234 Title');
    expect(logTester.logsParams).toStrictEqual([
      "Loading PR #42",
      "KEY-1234: Executing 'MergeBranch' (10001) transition",
      "Done",
    ]);
  });

});

