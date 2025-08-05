"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core = require("@actions/core");
const github = require("@actions/github");
const PullRequestCreated_1 = require("./PullRequestCreated");
const LogTester_1 = require("../tests/LogTester");
const JiraClientStub_1 = require("../tests/JiraClientStub");
const OctokitRestStub_1 = require("../tests/OctokitRestStub");
class TestPullRequestCreated extends PullRequestCreated_1.PullRequestCreated {
    async findEmail(login) {
        switch (login) {
            case 'test-user': return 'user@sonarsource.com';
            case 'renovate[bot]': return null;
            default: throw new Error(`Scaffolding did not expect login ${login}`);
        }
    }
}
async function runAction(jiraProject, title, body, user = 'test-user') {
    process.env['INPUT_JIRA-PROJECT'] = jiraProject;
    const action = new TestPullRequestCreated();
    action.jira = JiraClientStub_1.jiraClientStub;
    action.rest = (0, OctokitRestStub_1.createOctokitRestStub)(title, body, user);
    await action.run();
}
describe('PullRequestCreated', () => {
    const originalKeys = Object.keys(process.env);
    let logTester;
    beforeEach(() => {
        logTester = new LogTester_1.LogTester();
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
            const action = new PullRequestCreated_1.PullRequestCreated();
            await action.run();
            expect(logSpy).toHaveBeenCalledWith('Action failed: jira-project input is not supported when is-eng-xp-squad is set.');
        }
        finally {
            logSpy.mockRestore();
        }
    });
    it('is-eng-xp-squad and additional-fields fails', async () => {
        process.env['INPUT_IS-ENG-XP-SQUAD'] = 'true';
        process.env['INPUT_ADDITIONAL-FIELDS'] = '{ "Field": "Value" }';
        const logSpy = jest.spyOn(core, 'setFailed').mockImplementation(() => { });
        try {
            const action = new PullRequestCreated_1.PullRequestCreated();
            await action.run();
            expect(logSpy).toHaveBeenCalledWith('Action failed: additional-fields input is not supported when is-eng-xp-squad is set.');
        }
        finally {
            logSpy.mockRestore();
        }
    });
    it('DO NOT MERGE PR title skips the action', async () => {
        github.context.payload.pull_request.title = "Prefix [DO not MeRGe{: Test PR";
        const action = new PullRequestCreated_1.PullRequestCreated();
        action.log = jest.fn();
        await action.run();
        expect(action.log).toHaveBeenCalledWith("Done");
        expect(action.log).toHaveBeenCalledWith("'DO NOT MERGE' found in the PR title, skipping the action.");
    });
    it('No PR skips the action', async () => {
        class TestPullRequestCreated extends PullRequestCreated_1.PullRequestCreated {
            loadPullRequest() {
                return null;
            }
        }
        const action = new TestPullRequestCreated();
        action.log = jest.fn();
        await action.run();
        expect(action.log).toHaveBeenCalledWith('Done');
        expect(action.log).toHaveBeenCalledTimes(1);
    });
    it('Standalone PR simple', async () => {
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
//# sourceMappingURL=PullRequestCreated.test.js.map