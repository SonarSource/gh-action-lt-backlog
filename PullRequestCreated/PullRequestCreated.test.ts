import * as core from '@actions/core';
import * as github from '@actions/github';
import { PullRequestCreated } from './PullRequestCreated';
import { LogTester } from '../tests/LogTester';
import { jiraClientStub } from '../tests/JiraClientStub';
import { createOctokitRestStub } from '../tests/OctokitRestStub';

class TestPullRequestCreated extends PullRequestCreated {
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
  const action = new TestPullRequestCreated();
  (action as any).jira = jiraClientStub;
  (action as any).rest = createOctokitRestStub(title, body, user);
  await action.run();
}

describe('PullRequestCreated', () => {
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
        body: 'PR Description',
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

  it('is-eng-xp-squad and jira-project fails', async () => {
    process.env['INPUT_IS-ENG-XP-SQUAD'] = 'true';
    process.env['INPUT_JIRA-PROJECT'] = 'FORBIDDEN';
    const logSpy = jest.spyOn(core, 'setFailed').mockImplementation(() => { });
    try {
      const action = new PullRequestCreated();
      await action.run();
      expect(logSpy).toHaveBeenCalledWith('Action failed: jira-project input is not supported when is-eng-xp-squad is set.');
    } finally {
      logSpy.mockRestore();
    }
  });

  it('is-eng-xp-squad and additional-fields fails', async () => {
    process.env['INPUT_IS-ENG-XP-SQUAD'] = 'true';
    process.env['INPUT_ADDITIONAL-FIELDS'] = '{ "Field": "Value" }';
    const logSpy = jest.spyOn(core, 'setFailed').mockImplementation(() => { });
    try {
      const action = new PullRequestCreated();
      await action.run();
      expect(logSpy).toHaveBeenCalledWith('Action failed: additional-fields input is not supported when is-eng-xp-squad is set.');
    } finally {
      logSpy.mockRestore();
    }
  });

  it('DO NOT MERGE PR title skips the action', async () => {
    github.context.payload.pull_request.title = "Prefix [DO not MeRGe{: Test PR";
    const action = new PullRequestCreated();
    action.log = jest.fn();
    await action.run();
    expect(action.log).toHaveBeenCalledWith("Done");
    expect(action.log).toHaveBeenCalledWith("'DO NOT MERGE' found in the PR title, skipping the action.");
  });

  it('No PR skips the action', async () => {
    class TestPullRequestCreated extends PullRequestCreated {
      protected loadPullRequest() {
        return null;
      }
    }
    const action = new TestPullRequestCreated();
    action.log = jest.fn();
    await action.run();
    expect(action.log).toHaveBeenCalledWith('Done');
    expect(action.log).toHaveBeenCalledTimes(1);
  });

  it('Standalone PR no description', async () => {
    await runAction('KEY', 'Standalone PR');
    expect(logTester.logsParams).toStrictEqual([
      "Loading PR #42",
      "No mentioned issues found",
      "Looking for a non-Sub-task ticket",
      "No parent issue found",
      "Invoked jira.createIssue('KEY', 'Standalone PR', {\"issuetype\":{\"name\":\"Task\"},\"customfield_10001\":\"dot-neeet-team\",\"customfield_10020\":42})",
      "Updating PR #42 title to: KEY-4242 Standalone PR",
      "Invoked rest.pulls.update({\"owner\":\"test-owner\",\"repo\":\"test-repo\",\"pull_number\":42,\"title\":\"KEY-4242 Standalone PR\"})",
      "Invoked jira.addIssueRemoteLink('KEY-4242'', 'https://github.com/test-owner/test-repo/pull/42', null)",
      "Invoked jira.moveIssue('KEY-4242', 'Commit', null)",
      "Invoked jira.moveIssue('KEY-4242', 'Start', null)",
      "Invoked jira.assignIssueToAccount('KEY-4242', '1234-account')",
      "Adding the following ticket in description: KEY-4242",
      "Updating PR #42 description",
      "Invoked rest.pulls.update({\"owner\":\"test-owner\",\"repo\":\"test-repo\",\"pull_number\":42,\"body\":\"[KEY-4242](https://sonarsource.atlassian.net/browse/KEY-4242)\\n\\n\"})",
      "Done"
    ]);
  });

  it('Standalone PR with description', async () => {
    github.context.payload.pull_request.requested_teams = { type: 'Team', name: 'test-team' }; // Action does nothing additional when team is (auto)requested for review
    await runAction('KEY', 'Standalone PR', 'Original description');
    expect(logTester.logsParams).toStrictEqual([
      "Loading PR #42",
      "No mentioned issues found",
      "Looking for a non-Sub-task ticket",
      "No parent issue found",
      "Invoked jira.createIssue('KEY', 'Standalone PR', {\"issuetype\":{\"name\":\"Task\"},\"customfield_10001\":\"dot-neeet-team\",\"customfield_10020\":42})",
      "Updating PR #42 title to: KEY-4242 Standalone PR",
      "Invoked rest.pulls.update({\"owner\":\"test-owner\",\"repo\":\"test-repo\",\"pull_number\":42,\"title\":\"KEY-4242 Standalone PR\"})",
      "Invoked jira.addIssueRemoteLink('KEY-4242'', 'https://github.com/test-owner/test-repo/pull/42', null)",
      "Invoked jira.moveIssue('KEY-4242', 'Commit', null)",
      "Invoked jira.moveIssue('KEY-4242', 'Start', null)",
      "Invoked jira.assignIssueToAccount('KEY-4242', '1234-account')",
      "Adding the following ticket in description: KEY-4242",
      "Updating PR #42 description",
      "Invoked rest.pulls.update({\"owner\":\"test-owner\",\"repo\":\"test-repo\",\"pull_number\":42,\"body\":\"[KEY-4242](https://sonarsource.atlassian.net/browse/KEY-4242)\\n\\nOriginal description\"})",
      "Done"
    ]);
  });

  it('Standalone PR Renovate', async () => {
    await runAction('KEY', 'Standalone PR', null, 'renovate[bot]');
    expect(logTester.logsParams).toStrictEqual([
      "Loading PR #42",
      "Invoked jira.createIssue('KEY', 'Standalone PR', {\"issuetype\":{\"name\":\"Task\"},\"customfield_10001\":\"dot-neeet-team\",\"customfield_10020\":42})",
      "Invoked rest.issues.createComment({\"owner\":\"test-owner\",\"repo\":\"test-repo\",\"issue_number\":42,\"body\":\"Renovate Jira issue ID: [KEY-4242](https://sonarsource.atlassian.net/browse/KEY-4242)\"})",
      "Invoked jira.addIssueRemoteLink('KEY-4242'', 'https://github.com/test-owner/test-repo/pull/42', null)",
      "Invoked jira.moveIssue('KEY-4242', 'Commit', null)",
      "Invoked jira.moveIssue('KEY-4242', 'Start', null)",
      "Invoked jira.assignIssueToAccount('KEY-4242', '1234-account')",
      "Adding the following ticket in description: KEY-4242",
      "Updating PR #42 description",
      "Invoked rest.pulls.update({\"owner\":\"test-owner\",\"repo\":\"test-repo\",\"pull_number\":42,\"body\":\"[KEY-4242](https://sonarsource.atlassian.net/browse/KEY-4242)\\n\\n\"})",
      "Done"
    ]);
  });

  it('Standalone PR with reviewer', async () => {
    github.context.payload.pull_request.requested_reviewers = [{ type: "User", login: "test-user" }];
    await runAction('KEY', 'Standalone PR');
    expect(logTester.logsParams).toStrictEqual([
      "Loading PR #42",
      "No mentioned issues found",
      "Looking for a non-Sub-task ticket",
      "No parent issue found",
      "Invoked jira.createIssue('KEY', 'Standalone PR', {\"issuetype\":{\"name\":\"Task\"},\"customfield_10001\":\"dot-neeet-team\",\"customfield_10020\":42})",
      "Updating PR #42 title to: KEY-4242 Standalone PR",
      "Invoked rest.pulls.update({\"owner\":\"test-owner\",\"repo\":\"test-repo\",\"pull_number\":42,\"title\":\"KEY-4242 Standalone PR\"})",
      "Invoked jira.addIssueRemoteLink('KEY-4242'', 'https://github.com/test-owner/test-repo/pull/42', null)",
      "Invoked jira.moveIssue('KEY-4242', 'Commit', null)",
      "Invoked jira.moveIssue('KEY-4242', 'Start', null)",
      "Invoked jira.assignIssueToAccount('KEY-4242', '1234-account')",
      "Invoked jira.moveIssue('KEY-4242', 'Request Review', null)",
      "Invoked jira.assignIssueToEmail('KEY-4242', 'user@sonarsource.com')",
      "Adding the following ticket in description: KEY-4242",
      "Updating PR #42 description",
      "Invoked rest.pulls.update({\"owner\":\"test-owner\",\"repo\":\"test-repo\",\"pull_number\":42,\"body\":\"[KEY-4242](https://sonarsource.atlassian.net/browse/KEY-4242)\\n\\n\"})",
      "Done"
    ]);
  });

  it('Standalone PR isEngXpSquad', async () => {
    process.env['INPUT_IS-ENG-XP-SQUAD'] = 'true';
    await runAction('', 'Standalone PR');
    expect(logTester.logsParams).toStrictEqual([
      "Loading PR #42",
      "Invoked jira.createIssue('PREQ', 'Standalone PR', {\"issuetype\":{\"name\":\"Task\"},\"reporter\":{\"id\":\"1234-account\"},\"customfield_10001\":\"eb40f25e-3596-4541-b661-cf83e7bc4fa6\",\"customfield_10020\":42,\"labels\":[\"dvi-created-by-automation\"]})",
      "Updating PR #42 title to: PREQ-4242 Standalone PR",
      "Invoked rest.pulls.update({\"owner\":\"test-owner\",\"repo\":\"test-repo\",\"pull_number\":42,\"title\":\"PREQ-4242 Standalone PR\"})",
      "Invoked jira.addIssueRemoteLink('PREQ-4242'', 'https://github.com/test-owner/test-repo/pull/42', null)",
      "Invoked jira.moveIssue('PREQ-4242', 'Commit', null)",
      "Invoked jira.moveIssue('PREQ-4242', 'Start', null)",
      "Invoked jira.assignIssueToAccount('PREQ-4242', '1234-account')",
      "Adding the following ticket in description: PREQ-4242",
      "Updating PR #42 description",
      "Invoked rest.pulls.update({\"owner\":\"test-owner\",\"repo\":\"test-repo\",\"pull_number\":42,\"body\":\"[PREQ-4242](https://sonarsource.atlassian.net/browse/PREQ-4242)\\n\\n\"})",
      "Invoked jira.createComponent('PREQ', 'test-repo', 'https://github.com/test-owner/test-repo')",
      "Invoked jira.addIssueComponent('PREQ-4242', 'test-repo')",
      "Done"
    ]);
  });

  it('Normal PR cleans up title ', async () => {
    await runAction('KEY', '    GHA-1000    Useless whitespace ');
    expect(logTester.logsParams).toStrictEqual([
      "Loading PR #42",
      "Updating PR #42 title to: GHA-1000 Useless whitespace",
      "Invoked rest.pulls.update({\"owner\":\"test-owner\",\"repo\":\"test-repo\",\"pull_number\":42,\"title\":\"GHA-1000 Useless whitespace\"})",
      "Adding the following ticket in description: GHA-1000",
      "Updating PR #42 description",
      "Invoked rest.pulls.update({\"owner\":\"test-owner\",\"repo\":\"test-repo\",\"pull_number\":42,\"body\":\"[GHA-1000](https://sonarsource.atlassian.net/browse/GHA-1000)\\n\\n\"})",
      "Done"
    ]);
  });

  it('Normal PR isEngXpSquad', async () => {
    process.env['INPUT_IS-ENG-XP-SQUAD'] = 'true';
    await runAction('', 'BUILD-4444 Fix normal issue');
    expect(logTester.logsParams).toStrictEqual([
      "Loading PR #42",
      "Adding the following ticket in description: BUILD-4444",
      "Updating PR #42 description",
      "Invoked rest.pulls.update({\"owner\":\"test-owner\",\"repo\":\"test-repo\",\"pull_number\":42,\"body\":\"[BUILD-4444](https://sonarsource.atlassian.net/browse/BUILD-4444)\\n\\n\"})",
      "Invoked jira.createComponent('BUILD', 'test-repo', 'https://github.com/test-owner/test-repo')",
      "Invoked jira.addIssueComponent('BUILD-4444', 'test-repo')",
      "Done"
    ]);
  });
});
