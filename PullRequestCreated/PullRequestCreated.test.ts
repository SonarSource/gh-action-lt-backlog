import * as core from '@actions/core';
import * as github from '@actions/github';
import { PullRequestCreated } from './PullRequestCreated';

describe('PullRequestCreated', () => {
  const originalKeys = Object.keys(process.env);

  beforeEach(() => {
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
        body: 'PR Description'
      },
      sender: {
        login: 'test-user',
        type: "User"
      }
    };
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

  it.skip('Standalone PR simple', async () => {
    // ToDo: GHA-80
  });

  it.skip('Standalone PR Renovate', async () => {
    // ToDo: GHA-80
  });

  it.skip('Standalone PR with reviewer', async () => {
    // ToDo: GHA-80
  });

  it.skip('Standalone PR isEngXpSquad', async () => {
    // ToDo: GHA-80
  });

  it.skip('Normal PR cleans up title ', async () => {
    // ToDo: GHA-80
  });

  it.skip('Normal PR isEngXpSquad', async () => {
    // ToDo: GHA-80
  });
});
