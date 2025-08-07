"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const github = require("@actions/github");
const PullRequestClosed_1 = require("./PullRequestClosed");
const LogTester_1 = require("../tests/LogTester");
const JiraClientStub_1 = require("../tests/JiraClientStub");
const OctokitRestStub_1 = require("../tests/OctokitRestStub");
class TestPullRequestClosed extends PullRequestClosed_1.PullRequestClosed {
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
    const action = new TestPullRequestClosed();
    action.jira = JiraClientStub_1.jiraClientStub;
    action.rest = (0, OctokitRestStub_1.createOctokitRestStub)(title, body, user);
    await action.run();
}
describe('PullRequestClosed', () => {
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
                title: 'KEY-4444 Title',
                body: 'Description'
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
    it('PR merged by custom creator', async () => {
        github.context.payload.pull_request.merged = true;
        await runAction('KEY', 'KEY-1234 Title');
        expect(logTester.logsParams).toStrictEqual([
            "Loading PR #42"
        ]);
    });
});
//# sourceMappingURL=PullRequestClosed.test.js.map