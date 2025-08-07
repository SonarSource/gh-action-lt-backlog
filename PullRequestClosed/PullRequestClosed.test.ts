import * as core from '@actions/core';
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
        title: "KEY-4242 PR",
        body: 'KEY-4242',
        requested_reviewers: []
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

  it('Standalone PR no description', async () => {
    await runAction('KEY', 'Standalone PR');
    expect(logTester.logsParams).toStrictEqual([
      "Loading PR #42",
      "Done"
    ]);
  });
});
