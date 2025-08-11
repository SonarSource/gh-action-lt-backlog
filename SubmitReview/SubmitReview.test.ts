import * as github from '@actions/github';
import { LogTester } from '../tests/LogTester';
import { createOctokitRestStub } from '../tests/OctokitRestStub';
import { SubmitReview } from './SubmitReview';
import { jiraClientStub } from '../tests/JiraClientStub';

async function runAction(state: string, findEmailResult: string = null) {
  github.context.payload = {
    pull_request: {
      number: 42,
      title: "GHA-42 and GHA-43 are processed",
    },
    requested_reviewer: {
      login: "test-user",
      type: "User",
    },
    review: {
      state
    },
    sender: {
      login: 'test-user',
      type: "User"
    }
  };
  const action = new SubmitReview();
  (action as any).jira = jiraClientStub;
  (action as any).rest = createOctokitRestStub('GHA-42 and GHA-43 are processed');
  (action as any).findEmail = async function (login: string): Promise<string> {
    return findEmailResult;
  };
  await action.run();
}

describe('SubmitReview', () => {
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
  });

  afterEach(() => {
    logTester.afterEach();
  });

  it('Commented does nothing', async () => {
    await runAction('commented');
    expect(logTester.logsParams).toStrictEqual([
      "Loading PR #42",
      "Done",
    ]);
  });

  it('Request Changes moves issue', async () => {
    await runAction('changes_requested');
    expect(logTester.logsParams).toStrictEqual([
      "Loading PR #42",
      "Invoked jira.moveIssue('GHA-42', 'Request Changes', null)",
      "Invoked jira.moveIssue('GHA-43', 'Request Changes', null)",
      "Done",
    ]);
  });

  it('Approved moves issue', async () => {
    await runAction('approved');
    expect(logTester.logsParams).toStrictEqual([
      "Loading PR #42",
      "Invoked jira.moveIssue('GHA-42', 'Approve', null)",
      "Invoked jira.moveIssue('GHA-43', 'Approve', null)",
      "Done",
    ]);
  });

  it('Approved is-eng-xp-squad adds ReviewedBy', async () => {
    process.env['INPUT_IS-ENG-XP-SQUAD'] = 'true';
    await runAction('approved', 'user@sonarsource.com');
    expect(logTester.logsParams).toStrictEqual([
      "Loading PR #42",
      "Invoked jira.addReviewedBy('GHA-42', 'user@sonarsource.com')",
      "Invoked jira.addReviewedBy('GHA-43', 'user@sonarsource.com')",
      "Done",
    ]);
  });

  it('Approved is-eng-xp-squad unknown email', async () => {
    process.env['INPUT_IS-ENG-XP-SQUAD'] = 'true';
    await runAction('approved', null);
    expect(logTester.logsParams).toStrictEqual([
      "Loading PR #42",
      "Done",
    ]);
  });
});
