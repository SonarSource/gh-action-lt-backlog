import * as github from '@actions/github';
import { LogTester } from '../tests/LogTester';
import { createOctokitRestStub } from '../tests/OctokitRestStub';
import { PullRequestAction } from './PullRequestAction';

class TestPullRequestAction extends PullRequestAction {

  constructor(title: string, login?: string) {
    super();
    (this as any).rest = createOctokitRestStub(title, null, login);
  }

  async processJiraIssue(issueId: string): Promise<void> {
    this.log(`Invoked processJiraIssue(${issueId})`);
  }
}

describe('PullRequestAction', () => {
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
        title: "PR Title",
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

  it('No issue ID', async () => {
    const sut = new TestPullRequestAction("Standalone PR");
    await sut.run();
    expect(logTester.logsParams).toStrictEqual([
      "Loading PR #42",
      "No Jira issue found in the PR title.",
      "Done",
    ]);
  });

  it('Process all title issue IDs', async () => {
    const sut = new TestPullRequestAction("GHA-42, [GHA-43] And also SCAN4NET-44 with number in project key, but no lowercase-22");
    await sut.run();
    expect(logTester.logsParams).toStrictEqual([
      "Loading PR #42",
      "Invoked processJiraIssue(GHA-42)",
      "Invoked processJiraIssue(GHA-43)",
      "Invoked processJiraIssue(SCAN4NET-44)",
      "Done",
    ]);
  });

  it('Process renovate issue ID', async () => {
    const sut = new TestPullRequestAction("Renovate PR with ID in comment", "renovate[bot]");
    (sut as any).rest.issues.listComments = function (params: any): any {
      return {
        data: [
          { body: "Renovate Jira issue ID: GHA-42" }
        ]
      }
    };
    await sut.run();
    expect(logTester.logsParams).toStrictEqual([
      "Loading PR #42",
      "Invoked processJiraIssue(GHA-42)",
      "Done"
    ]);
  });

  it('Ignore BUILD and PREQ', async () => {
    const sut = new TestPullRequestAction("GHA-42 is processed but BUILD-42 and PREQ-43 are ignored");
    await sut.run();
    expect(logTester.logsParams).toStrictEqual([
      "Loading PR #42",
      "Invoked processJiraIssue(GHA-42)",
      "Skipping BUILD-42",
      "Skipping PREQ-43",
      "Done"
    ]);
  });

  it('Process BUILD and PREQ for is-eng-xp-squad', async () => {
    const sut = new TestPullRequestAction("BUILD-42 and PREQ-43 are processed");
    (sut as any).isEngXpSquad = true;
    await sut.run();
    expect(logTester.logsParams).toStrictEqual([
      "Loading PR #42",
      "Invoked processJiraIssue(BUILD-42)",
      "Invoked processJiraIssue(PREQ-43)",
      "Done",
    ]);
  });
});
