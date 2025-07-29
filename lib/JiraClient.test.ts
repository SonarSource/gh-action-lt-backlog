import { JiraClient } from './JiraClient';
import { fail } from 'assert';

const sandboxDomain = 'https://sonarsource-sandbox-608.atlassian.net';
const sandboxSiteId = '5ea71b8c-f3d5-4b61-b038-001c50df1666';
const sandboxOrganizationId = '78eed3e4-84ad-4374-b777-a3b4ba5d9516';
let sut: JiraClient;

beforeAll(() => {
  const user = process.env["JIRA_USER"];    // Can't use the same name as environment variables read by Octokit actions, because the dash is not propagated from shell to node
  const token = process.env["JIRA_TOKEN"];
  if (user && token) {
    sut = new JiraClient(sandboxDomain, sandboxSiteId, sandboxOrganizationId, user, token);
  } else {
    fail("JiraClient tests require JIRA_USER and JIRA_TOKEN environment variables to be set."); 
  }
});

describe('JiraClient', () => {
  it('handles errors', async () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => { });
    const withoutToken = new JiraClient(sandboxDomain, sandboxSiteId, sandboxOrganizationId, 'wrong', 'token');
    const result = await withoutToken.loadIssue("TEST-42");
    expect(result).toBeNull();
    expect(logSpy).toHaveBeenCalledWith('404 (Not Found): Issue does not exist or you do not have permission to see it.');
    expect(logSpy).toHaveBeenCalledWith(`{
  "errorMessages": [
    "Issue does not exist or you do not have permission to see it."
  ],
  "errors": {}
}`);
  });

  it.skip('createIssue', async () => {
    // FIXME
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