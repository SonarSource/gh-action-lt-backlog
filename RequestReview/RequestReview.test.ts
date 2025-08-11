import * as github from '@actions/github';
import { LogTester } from '../tests/LogTester';
import { createOctokitRestStub } from '../tests/OctokitRestStub';
import { RequestReview } from './RequestReview';
import { jiraClientStub } from '../tests/JiraClientStub';
import { OctokitActionStub } from '../tests/OctokitActionStub';

describe('RequestReview', () => {
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
      requested_reviewer: {
        login: "test-user",
        type: "User",
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

  // This is just a smoke test to make sure the other components works together. Details are tested in their respective classes
  it('Processes all issues in title', async () => {
    const sut = new RequestReview() as RequestReview & OctokitActionStub;
    sut.jira = jiraClientStub;
    sut.rest = createOctokitRestStub("GHA-42 and GHA-43");
    sut.findEmail = async function (login: string): Promise<string> {
      return "user@sonarsource.com";
    }
    await sut.run();
    expect(logTester.logsParams).toStrictEqual([
      "Loading PR #42",
      "Invoked jira.moveIssue('GHA-42', 'Request Review', null)",
      "Invoked jira.assignIssueToEmail('GHA-42', 'user@sonarsource.com')",
      "Invoked jira.moveIssue('GHA-43', 'Request Review', null)",
      "Invoked jira.assignIssueToEmail('GHA-43', 'user@sonarsource.com')",
      "Done",
    ]);
  });
});
