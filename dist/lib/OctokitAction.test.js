"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const LogTester_1 = require("../tests/LogTester");
const JiraClientStub_1 = require("../tests/JiraClientStub");
const OctokitRestStub_1 = require("../tests/OctokitRestStub");
const OctokitAction_1 = require("./OctokitAction");
const assert_1 = require("assert");
class TestOctokitAction extends OctokitAction_1.OctokitAction {
    constructor() {
        super();
        this.jira = { ...JiraClientStub_1.jiraClientStub }; // Expanded copy, we'll be modifying it in these tests
        this.rest = (0, OctokitRestStub_1.createOctokitRestStub)('PR title');
    }
    async execute() {
        this.log('Invoked execute()');
    }
}
describe('OctokitAction', () => {
    const originalKeys = Object.keys(process.env);
    const itRunsOnlyInCI = process.env.GITHUB_ACTIONS === 'true' ? it : it.skip;
    let logTester;
    let sut; // TestOctokitAction, but with access to protected methods
    beforeEach(() => {
        logTester = new LogTester_1.LogTester();
        const token = process.env["GITHUB_TOKEN"];
        if (token) {
            for (const key of Object.keys(process.env)) {
                if (!originalKeys.includes(key)) {
                    // Otherwise, changes form previous UT are propagated to the next one
                    delete process.env[key];
                }
            }
            process.env['GITHUB_REPOSITORY'] = 'test-owner/test-repo';
            process.env['INPUT_GITHUB-TOKEN'] = token;
            sut = new TestOctokitAction();
        }
        else {
            (0, assert_1.fail)("OctokitAction tests require GITHUB_TOKEN environment variables to be set.");
        }
    });
    afterEach(() => {
        logTester.afterEach();
    });
    it('isEngXpSquad is true', async () => {
        process.env['INPUT_IS-ENG-XP-SQUAD'] = 'true';
        const action = new TestOctokitAction();
        expect(action.isEngXpSquad).toBe(true);
    });
    it('isEngXpSquad is false', async () => {
        const action = new TestOctokitAction();
        expect(action.isEngXpSquad).toBe(false);
    });
    it('sendGraphQL', async () => {
        const result = await sut.sendGraphQL(`
      query {
        repository (owner: "SonarSource", name: "gh-action-lt-backlog") {
          id
          name
        }
      }`);
        expect(result).toEqual({
            repository: {
                id: "R_kgDOGZ6k-Q",
                name: "gh-action-lt-backlog"
            }
        });
    });
    it('inputString', async () => {
        process.env['INPUT_KEY'] = 'Value'; // KEY must be upper case, otherwise Ubuntu in CI doesn't work
        expect(sut.inputString('key')).toBe('Value');
        expect(sut.inputString('missing')).toBe('');
    });
    it('inputNumber', async () => {
        process.env['INPUT_KEY'] = '42';
        process.env['INPUT_STRING'] = 'Lorem Ipsum';
        expect(sut.inputNumber('key')).toBe(42);
        expect(() => sut.inputNumber('string')).toThrow("Value of input 'string' is not a number: Lorem Ipsum");
    });
    it('inputBoolean true', async () => {
        for (const value of ['true', 'True', 'TRUE', 'tRuE']) {
            process.env['INPUT_KEY'] = value;
            expect(sut.inputBoolean('key')).toBe(true);
        }
    });
    it('inputBoolean false', async () => {
        for (const value of ['', 'false', 'False', '0', 'no']) {
            process.env['INPUT_KEY'] = value;
            expect(sut.inputBoolean('key')).toBe(false);
        }
    });
    it('loadPullRequest', async () => {
        const pr = await sut.loadPullRequest(42);
        expect(pr).toMatchObject({ number: 42, title: "PR title" }); // Plus the remaining properties from scaffolding
        expect(logTester.logsParams).toStrictEqual(["Loading PR #42"]);
    });
    it('loadIssue', async () => {
        const issue = await sut.loadIssue(24);
        expect(issue).toMatchObject({ number: 24, title: "Issue title" }); // Plus the remaining properties from scaffolding
        expect(logTester.logsParams).toStrictEqual(["Loading issue #24"]);
    });
    it('findFixedIssues no issue', async () => {
        const pr = await sut.loadPullRequest(42);
        pr.title = "Standalone PR";
        expect(await sut.findFixedIssues(pr)).toBeNull();
    });
    it('findFixedIssues with issues', async () => {
        const pr = await sut.loadPullRequest(42);
        pr.title = "GHA-42, [GHA-43] And also SCAN4NET-44 with number in project key, but no lowercase-22";
        expect(await sut.findFixedIssues(pr)).toStrictEqual([
            "GHA-42",
            "GHA-43",
            "SCAN4NET-44"
        ]);
    });
    it('findFixedIssues renovate no renovate issue comment', async () => {
        sut.rest.issues.listComments = function (params) {
            return {
                data: [
                    { body: "SQ QG or something else" },
                    { body: null },
                ]
            };
        };
        const pr = await sut.loadPullRequest(42);
        pr.user.login = 'renovate[bot]';
        expect(await sut.findFixedIssues(pr)).toBeNull();
    });
    it('findFixedIssues renovate with renovate issue issue', async () => {
        sut.rest.issues.listComments = function (params) {
            return {
                data: [
                    { body: "SQ QG or something else" },
                    { body: null },
                    { body: "Renovate Jira issue ID: GHA-42" }
                ]
            };
        };
        const pr = await sut.loadPullRequest(42);
        pr.user.login = 'renovate[bot]';
        expect(await sut.findFixedIssues(pr)).toStrictEqual(["GHA-42"]);
    });
    it('addComment', async () => {
        await sut.addComment(42, "Lorem ipsum");
        expect(logTester.logsParams).toStrictEqual(["Invoked rest.issues.createComment({\"owner\":\"test-owner\",\"repo\":\"test-repo\",\"issue_number\":42,\"body\":\"Lorem ipsum\"})"]);
    });
    it('listComments', async () => {
        await sut.listComments(42);
        expect(logTester.logsParams).toStrictEqual(["Invoked rest.issues.listComments({\"owner\":\"test-owner\",\"repo\":\"test-repo\",\"issue_number\":42})"]);
    });
    it('updateIssueTitle', async () => {
        await sut.updateIssueTitle(42, 'New title');
        expect(logTester.logsParams).toStrictEqual([
            "Updating issue #42 title to: New title",
            "Invoked rest.issues.update({\"owner\":\"test-owner\",\"repo\":\"test-repo\",\"issue_number\":42,\"title\":\"New title\"})"
        ]);
    });
    it('updatePullRequestTitle', async () => {
        await sut.updatePullRequestTitle(42, 'New title');
        expect(logTester.logsParams).toStrictEqual([
            "Updating PR #42 title to: New title",
            "Invoked rest.pulls.update({\"owner\":\"test-owner\",\"repo\":\"test-repo\",\"pull_number\":42,\"title\":\"New title\"})"
        ]);
    });
    it('updatePullRequestDescription', async () => {
        await sut.updatePullRequestDescription(42, 'New description');
        expect(logTester.logsParams).toStrictEqual([
            "Updating PR #42 description",
            "Invoked rest.pulls.update({\"owner\":\"test-owner\",\"repo\":\"test-repo\",\"pull_number\":42,\"body\":\"New description\"})"
        ]);
    });
    it.skip('findEmail returns first', async () => {
    });
    it.skip('findEmail no results', async () => {
    });
    it.skip('findEmail bad token', async () => {
    });
    // Local token is difficult to craft
    itRunsOnlyInCI('sendSlackMessage succeeds', async () => {
        process.env['INPUT_SLACK-TOKEN'] = process.env.SLACK_TOKEN;
        process.env['INPUT_SLACK-CHANNEL'] = 'notification_tester';
        await sut.sendSlackMessage('gh-action-lt-backlog Unit Test');
        expect(logTester.logsParams).toStrictEqual([
            "Sending Slack message",
            "Sending slack POST: {\"channel\":\"notification_tester\",\"text\":\"gh-action-lt-backlog Unit Test\"}",
        ]);
    });
    // Local token is difficult to craft
    itRunsOnlyInCI('sendSlackMessage fails', async () => {
        process.env['INPUT_SLACK-TOKEN'] = process.env.SLACK_TOKEN;
        process.env['INPUT_SLACK-CHANNEL'] = 'this_channel_exists_only_when_someone_trolls_this_test';
        await sut.sendSlackMessage('gh-action-lt-backlog Unit Test');
        expect(logTester.logsParams).toStrictEqual([
            "Sending Slack message",
            "Sending slack POST: {\"channel\":\"this_channel_exists_only_when_someone_trolls_this_test\",\"text\":\"gh-action-lt-backlog Unit Test\"}",
            "Failed to send API request. Error: channel_not_found"
        ]);
    });
    it('processRequestReview', async () => {
        sut.findEmail = async function (login) {
            return "test.user@sonarsource.com";
        };
        await sut.processRequestReview("42", { login: 'test-user', type: 'User' });
        expect(logTester.logsParams).toStrictEqual([
            "Invoked jira.moveIssue('42', 'Request Review', null)",
            "Invoked jira.assignIssueToEmail('42', 'test.user@sonarsource.com')"
        ]);
    });
    it('processRequestReview is-eng-xp-squad', async () => {
        sut.isEngXpSquad = true;
        sut.findEmail = async function (login) {
            return "test.user@sonarsource.com";
        };
        await sut.processRequestReview("42", { login: 'test-user', type: 'User' });
        expect(logTester.logsParams).toStrictEqual([
            "Invoked jira.moveIssue('42', 'Request Review', null)",
            "Invoked jira.addReviewer('42', 'test.user@sonarsource.com')"
        ]);
    });
    it('processRequestReview from team', async () => {
        await sut.processRequestReview("42", null);
        expect(logTester.logsParams).toStrictEqual(["Invoked jira.moveIssue('42', 'Request Review', null)"]);
    });
    it('processRequestReview from Bot', async () => {
        await sut.processRequestReview("42", { login: 'renovate[bot]', type: 'Bot' });
        expect(logTester.logsParams).toStrictEqual(["Skipping request review from bot: renovate[bot]"]);
    });
    it('addJiraComponent success', async () => {
        await sut.addJiraComponent('GHA-42', 'Component Name', 'Component Description');
        expect(logTester.logsParams).toStrictEqual([
            "Invoked jira.createComponent('GHA', 'Component Name', 'Component Description')",
            "Invoked jira.addIssueComponent('GHA-42', 'Component Name')",
        ]);
    });
    it('addJiraComponent fails to create component', async () => {
        sut.jira.createComponent = async function (projectKey, name, description) {
            console.log('Invoked jira.createComponent returning false');
            return false;
        };
        sut.setFailed = jest.fn();
        await sut.addJiraComponent('GHA-42', 'Component Name', 'Component Description');
        expect(sut.setFailed).toHaveBeenCalledWith('Failed to create component');
        expect(logTester.logsParams).toStrictEqual(["Invoked jira.createComponent returning false"]);
    });
    it('addJiraComponent fails to assign component', async () => {
        sut.jira.addIssueComponent = async function (issueId, name) {
            console.log('Invoked jira.addIssueComponent returning false');
            return false;
        };
        sut.setFailed = jest.fn();
        await sut.addJiraComponent('GHA-42', 'Component Name', 'Component Description');
        expect(sut.setFailed).toHaveBeenCalledWith('Failed to add component');
        expect(logTester.logsParams).toStrictEqual([
            "Invoked jira.createComponent('GHA', 'Component Name', 'Component Description')",
            "Invoked jira.addIssueComponent returning false"
        ]);
    });
});
//# sourceMappingURL=OctokitAction.test.js.map