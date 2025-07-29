"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const AtlassianDocumentFormat_1 = require("./AtlassianDocumentFormat");
const JiraClient_1 = require("./JiraClient");
const assert_1 = require("assert");
const TeamConfiguration_1 = require("../Data/TeamConfiguration");
const sandboxDomain = 'https://sonarsource-sandbox-608.atlassian.net';
const sandboxSiteId = '5ea71b8c-f3d5-4b61-b038-001c50df1666';
const sandboxOrganizationId = '78eed3e4-84ad-4374-b777-a3b4ba5d9516';
let sut;
beforeAll(() => {
    const user = process.env["JIRA_USER"]; // Can't use the same name as environment variables read by Octokit actions, because the dash is not propagated from shell to node
    const token = process.env["JIRA_TOKEN"];
    if (user && token) {
        sut = new JiraClient_1.JiraClient(sandboxDomain, sandboxSiteId, sandboxOrganizationId, user, token);
    }
    else {
        (0, assert_1.fail)("JiraClient tests require JIRA_USER and JIRA_TOKEN environment variables to be set.");
    }
});
async function findFirstActiveSprintId() {
    for (const team of TeamConfiguration_1.TeamConfigurationData) {
        const sprintId = await sut.findSprintId(team.boardId);
        if (sprintId) {
            return sprintId;
        }
    }
    (0, assert_1.fail)('Scaffolding: Could not find any active sprint ID');
}
describe('JiraClient', () => {
    it('handles errors', async () => {
        const logSpy = jest.spyOn(console, 'log').mockImplementation(() => { });
        try {
            const withoutToken = new JiraClient_1.JiraClient(sandboxDomain, sandboxSiteId, sandboxOrganizationId, 'wrong', 'token');
            const result = await withoutToken.loadIssue("TEST-42");
            expect(result).toBeNull();
            expect(logSpy).toHaveBeenCalledWith('404 (Not Found): Issue does not exist or you do not have permission to see it.');
            expect(logSpy).toHaveBeenCalledWith(`{
  "errorMessages": [
    "Issue does not exist or you do not have permission to see it."
  ],
  "errors": {}
}`);
        }
        finally {
            logSpy.mockRestore();
        }
    });
    it('createIssue', async () => {
        const summary = `JiraClient unit test ${crypto.randomUUID()}`;
        const sprintId = await findFirstActiveSprintId();
        // The GHA project needs to have all of these on it's create screen in production and sandbox, as production overrides the sandbox once in a while
        const parameters = {
            issuetype: { name: 'Improvement' },
            labels: ['FirstLabel', 'SecondLabel'],
            parent: { key: 'GHA-37' },
            reporter: { id: '712020:7dcfc909-3fa9-496f-9127-163d8cd0e30f' }, // "Jira Automation". Any user except the "Jira Tech User GitHub" that would be used as a default user assigned by the token 
            description: AtlassianDocumentFormat_1.AtlassianDocument.fromMarkdown('Lorem ipsum'),
            customfield_10001: '3ca60b21-53c7-48e2-a2e2-6e85b39551d0', // Patlassian* Team ID - .NET Squad 
            customfield_10020: sprintId, // Patlassian* Sprint IT - needs an active sprint
        };
        const result = await sut.createIssue('GHA', summary, parameters);
        expect(result).not.toBeNull();
        expect(result).toContain("GHA-");
        const issue = await sut.loadIssue(result);
        expect(issue).not.toBeNull();
        expect(issue.fields).toMatchObject({
            issuetype: { name: 'Improvement' },
            labels: ['FirstLabel', 'SecondLabel'],
            parent: { key: 'GHA-37' },
            reporter: { accountId: '712020:7dcfc909-3fa9-496f-9127-163d8cd0e30f' }, // The same thing has two different names in different API calls, of course.
            description: AtlassianDocumentFormat_1.AtlassianDocument.fromMarkdown('Lorem ipsum'),
            customfield_10001: { id: '3ca60b21-53c7-48e2-a2e2-6e85b39551d0' }, // Why would the same field have same structure everywhere anyway?
            customfield_10020: [{ id: sprintId }], // Why would the same field have same structure everywhere anyway?
        });
    });
    it('loadIssue', async () => {
        const result = await sut.loadIssue('GHA-42');
        expect(result).not.toBeNull();
        expect(result.key).toBe('GHA-42');
        expect(result.fields).not.toBeNull();
        expect(result.fields.summary).toBe('Import sonar-dotnet');
    });
    it.skip('createIssue', async () => {
        // FIXME
    });
    it.skip('loadProject', async () => {
        // FIXME
    });
    it.skip('findTransition', async () => {
        // FIXME
    });
    it.skip('transitionIssue', async () => {
        // FIXME
    });
    it.skip('assignIssueToEmail', async () => {
        // FIXME
    });
    it.skip('assignIssueToAccount', async () => {
        // FIXME
    });
    it.skip('addReviewer', async () => {
        // FIXME
    });
    it.skip('addReviewedBy', async () => {
        // FIXME
    });
    it.skip('addIssueComponent', async () => {
        // FIXME
    });
    it.skip('addIssueRemoteLink', async () => {
        // FIXME
    });
    it.skip('findAccountId', async () => {
        // FIXME
    });
    it.skip('findSprintId', async () => {
        // FIXME
    });
    it.skip('findTeam', async () => {
        // FIXME
    });
    it.skip('createComponent', async () => {
        // FIXME
    });
});
//# sourceMappingURL=JiraClient.test.js.map