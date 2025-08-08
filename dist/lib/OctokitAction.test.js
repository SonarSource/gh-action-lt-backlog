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
        this.jira = JiraClientStub_1.jiraClientStub;
        this.rest = (0, OctokitRestStub_1.createOctokitRestStub)('PR title');
    }
    async execute() {
        this.log('Invoked execute()');
    }
}
describe('OctokitAction', () => {
    const originalKeys = Object.keys(process.env);
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
        expect(pr).toMatchObject({ number: 42, title: "PR title" }); // Plus the remainig properties from scaffolding
        expect(logTester.logsParams).toStrictEqual(["Loading PR #42"]);
    });
    it('loadIssue', async () => {
        const issue = await sut.loadIssue(24);
        expect(issue).toMatchObject({ number: 24, title: "Issue title" }); // Plus the remainig properties from scaffolding
        expect(logTester.logsParams).toStrictEqual(["Loading issue #24"]);
    });
    it.skip('findFixedIssues no body', async () => {
    });
    it.skip('findFixedIssues no issue', async () => {
    });
    it.skip('findFixedIssues with issues in body', async () => {
    });
    it.skip('findFixedIssues renovate no issue', async () => {
    });
    it.skip('findFixedIssues renovate with issue', async () => {
    });
    it.skip('addComment', async () => {
    });
    it.skip('listComments', async () => {
    });
    it.skip('updateIssueTitle', async () => {
    });
    it.skip('updatePullRequestTitle', async () => {
    });
    it.skip('updatePullRequestDescription', async () => {
    });
    it.skip('findEmail returns first', async () => {
    });
    it.skip('findEmail no results', async () => {
    });
    it.skip('findEmail bad token', async () => {
    });
    it.skip('sendSlackMessage', async () => {
    });
    it.skip('processRequestReview', async () => {
    });
    it.skip('addJiraComponent success', async () => {
    });
    it.skip('addJiraComponent fails to create component', async () => {
    });
    it.skip('addJiraComponent fails to assign component', async () => {
    });
});
//# sourceMappingURL=OctokitAction.test.js.map