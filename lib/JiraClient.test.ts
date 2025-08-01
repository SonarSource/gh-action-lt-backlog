﻿import { AtlassianDocument } from './AtlassianDocumentFormat';
import { JiraClient } from './JiraClient';
import { fail } from 'assert';
import { NewIssueParameters } from './NewIssueParameters';
import { EngineeringExperienceSquad, TeamConfigurationData } from '../Data/TeamConfiguration';
import { Config } from './Configuration';

const sandboxDomain = 'https://sonarsource-sandbox-608.atlassian.net';
const sandboxSiteId = '5ea71b8c-f3d5-4b61-b038-001c50df1666';
const sandboxOrganizationId = '78eed3e4-84ad-4374-b777-a3b4ba5d9516';
let sut: JiraClient;
let issueId: string;
let preqIssueId: string;

beforeAll(async () => {
  const user = process.env["JIRA_USER"];    // Can't use the same name as environment variables read by Octokit actions, because the dash is not propagated from shell to node
  const token = process.env["JIRA_TOKEN"];
  if (user && token) {
    sut = new JiraClient(sandboxDomain, sandboxSiteId, sandboxOrganizationId, user, token);
    const parameters: NewIssueParameters = { issuetype: { name: 'New Feature' } };
    issueId = await sut.createIssue('GHA', `JiraClient unit test shared ${crypto.randomUUID()}`, parameters);
  } else {
    fail("JiraClient tests require JIRA_USER and JIRA_TOKEN environment variables to be set.");
  }
});

async function findFirstActiveSprintId(): Promise<number> {
  for (const team of TeamConfigurationData) {
    const sprintId = await sut.findSprintId(team.boardId);
    if (sprintId) {
      return sprintId;
    }
  }
  fail('Scaffolding: Could not find any active sprint ID');
}

async function ensurePreqIssueId(): Promise<string> {
  if (!preqIssueId) {
    const parameters: NewIssueParameters = { issuetype: { name: 'Task' } };
    preqIssueId = await sut.createIssue('PREQ', `JiraClient unit test PREQ ${crypto.randomUUID()}`, parameters);
  }
  return preqIssueId;
}

describe('JiraClient', () => {
  it('handles errors', async () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation((...args) => jest.requireActual('console').log(...args));
    try {
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
    } finally {
      logSpy.mockRestore();
    }
  });

  it('createIssue', async () => {
    const summary = `JiraClient unit test createIssue ${crypto.randomUUID()}`;
    const sprintId = await findFirstActiveSprintId()
    // The GHA project needs to have all of these on it's create screen in production and sandbox, as production overrides the sandbox once in a while
    const parameters: NewIssueParameters = {
      issuetype: { name: 'Improvement' },
      labels: ['FirstLabel', 'SecondLabel'],
      parent: { key: 'GHA-37' },
      reporter: { id: '712020:7dcfc909-3fa9-496f-9127-163d8cd0e30f' },  // "Jira Automation". Any user except the "Jira Tech User GitHub" that would be used as a default user assigned by the token 
      description: AtlassianDocument.fromMarkdown('Lorem ipsum'),
      customfield_10001: '3ca60b21-53c7-48e2-a2e2-6e85b39551d0',  // Patlassian* Team ID - .NET Squad 
      customfield_10020: sprintId,                                // Patlassian* Sprint IT - needs an active sprint
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
      reporter: { accountId: '712020:7dcfc909-3fa9-496f-9127-163d8cd0e30f' },   // The same thing has two different names in different API calls, of course.
      description: {
        "type": "doc",
        "version": 1,
        "content": [
          {
            "type": "paragraph",
            "content": [
              {
                "type": "text",
                "text": "Lorem ipsum"
              }
            ]
          }
        ]
      },
      customfield_10001: { id: '3ca60b21-53c7-48e2-a2e2-6e85b39551d0' },        // Why would the same field have same structure everywhere anyway?
      customfield_10020: [{ id: sprintId }],                                    // Why would the same field have same structure everywhere anyway?
    });
  });

  it('loadIssue', async () => {
    const result = await sut.loadIssue('GHA-42');
    expect(result).not.toBeNull();
    expect(result.key).toBe('GHA-42');
    expect(result.fields).not.toBeNull();
    expect(result.fields.summary).toBe('Import sonar-dotnet');

  });

  it('loadProject', async () => {
    expect(await sut.loadProject('GHA')).toMatchObject({
      key: 'GHA',
      lead: { accountId: '5dc3f7c6e3cc320c5e8a91f1', displayName: 'Pavel Mikula' }
    });
  });

  it('moveIssue no transition', async () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation((...args) => jest.requireActual('console').log(...args));
    try {
      await sut.moveIssue('GHA-42', 'Hallucinated');
      expect(logSpy).toHaveBeenCalledWith("GHA-42: Could not find the transition 'Hallucinated'");
    } finally {
      logSpy.mockRestore();
    }
  });

  it('moveIssue moves issue', async () => {
    await sut.moveIssue(issueId, 'Start');
    expect((await sut.loadIssue(issueId)).fields.status.name).toBe('In Progress');
  });

  it('findTransition no transition', async () => {
    expect(await sut.findTransition(issueId, 'Hallucinated')).toBeNull();
  });

  it('findTransition finds', async () => {
    expect(await sut.findTransition(issueId, 'Cancel Issue')).toMatchObject({ id: "11", name: 'Cancel Issue', });
  });

  it('transitionIssue', async () => {
    await sut.moveIssue(issueId, 'Close as Done');
    expect((await sut.loadIssue(issueId)).fields.status.name).toBe('Done');
  });

  it('assignIssueToEmail', async () => {
    let issue = await sut.loadIssue(issueId);
    const email = issue.fields.assignee?.emailAddress === 'helpdesk+jira-githubtech@sonarsource.com' ? 'pavel.mikula@sonarsource.com' : 'helpdesk+jira-githubtech@sonarsource.com';
    await sut.assignIssueToEmail(issueId, email);
    issue = await sut.loadIssue(issueId);
    expect(issue.fields.assignee?.emailAddress).toBe(email);
  });

  it('assignIssueToAccount', async () => {
    let issue = await sut.loadIssue(issueId);
    const accountId = issue.fields.assignee?.accountId === "712020:9dcffe4d-55ee-4d69-b5d1-535c6dbd9cc4" ? "5dc3f7c6e3cc320c5e8a91f1" : "712020:9dcffe4d-55ee-4d69-b5d1-535c6dbd9cc4";
    await sut.assignIssueToAccount(issueId, accountId);
    issue = await sut.loadIssue(issueId);
    expect(issue.fields.assignee?.accountId).toBe(accountId);
  });

  it('addReviewer', async () => {
    const issueId = await ensurePreqIssueId();
    await sut.addReviewer(issueId, 'helpdesk+jira-githubtech@sonarsource.com');
    let issue = await sut.loadIssue(issueId);
    expect(issue.fields.customfield_11227).toMatchObject([{ emailAddress: 'helpdesk+jira-githubtech@sonarsource.com' }]);
    // Second call does not change anything
    await sut.addReviewer(issueId, 'helpdesk+jira-githubtech@sonarsource.com');
    issue = await sut.loadIssue(issueId);
    expect(issue.fields.customfield_11227).toMatchObject([{ emailAddress: 'helpdesk+jira-githubtech@sonarsource.com' }]);
  });

  it('addReviewedBy', async () => {
    const issueId = await ensurePreqIssueId();
    await sut.addReviewedBy(issueId, 'helpdesk+jira-githubtech@sonarsource.com');
    let issue = await sut.loadIssue(issueId);
    expect(issue.fields.customfield_11228).toMatchObject([{ emailAddress: 'helpdesk+jira-githubtech@sonarsource.com' }]);
    // Second call does not change anything
    await sut.addReviewedBy(issueId, 'helpdesk+jira-githubtech@sonarsource.com');
    issue = await sut.loadIssue(issueId);
    expect(issue.fields.customfield_11228).toMatchObject([{ emailAddress: 'helpdesk+jira-githubtech@sonarsource.com' }]);
  });

  it('createComponent existing', async () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation((...args) => jest.requireActual('console').log(...args));
    try {
      const name = 'JiraClient UT';
      const result = await sut.createComponent('GHA', name, 'Test component created by JiraClient unit test');
      expect(result).toBe(true);
      expect(logSpy).toHaveBeenCalledWith(`Searching for component 'JiraClient UT' in project GHA`);
      expect(logSpy).toHaveBeenCalledWith(expect.stringMatching(/Component found in \d+ result\(s\)/));
    } finally {
      logSpy.mockRestore();
    }
  });

  it('createComponent new', async () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation((...args) => jest.requireActual('console').log(...args));
    try {
      const name = `JiraClient UT  ${crypto.randomUUID()}`;
      const result = await sut.createComponent('GHA', name, 'Test component created by JiraClient unit test');
      expect(result).toBe(true);
      expect(logSpy).toHaveBeenCalledWith(`Searching for component '${name}' in project GHA`);
      expect(logSpy).toHaveBeenCalledWith(expect.stringMatching(/Component not found in \d+ result\(s\). Creating a new one./));
      const project = await sut.loadProject('GHA');
      const component = project.components.find(x => x.name === name);
      expect(component).toMatchObject({ name, description: 'Test component created by JiraClient unit test' });
    } finally {
      logSpy.mockRestore();
    }
  });

  it('addIssueComponent', async () => {
    expect(await sut.addIssueComponent(issueId, 'JiraClient UT')).toBe(true);
    const issue = await sut.loadIssue(issueId);
    expect(issue.fields.components).toMatchObject([{ name: 'JiraClient UT' }]);
  });

  it('addIssueRemoteLink and loadIssueRemoteLinks', async () => {
    await sut.addIssueRemoteLink(issueId, 'https://www.sonarsource.com/', 'Sonar');
    expect(await sut.loadIssueRemoteLinks(issueId)).toMatchObject([{ object: { url: 'https://www.sonarsource.com/', title: 'Sonar' } }]);
  });

  it('findAccountId', async () => {
    expect(await sut.findAccountId('helpdesk+jira-githubtech@sonarsource.com')).toBe('712020:9dcffe4d-55ee-4d69-b5d1-535c6dbd9cc4');
  });

  it('findSprintId', async () => {
    const boardId = Config.findTeam(EngineeringExperienceSquad.name).boardId;
    expect(await sut.findSprintId(boardId)).toBeGreaterThan(0);
  });

  it('findTeamByUser', async () => {
    const accountId = '557058:f82b4ae5-78e0-4689-9f9e-419b773bf121';                        // Thomas Vérin The Greatest, it can be any member of Eng Xp squad Jira team
    expect(await sut.findTeamByUser(accountId)).toMatchObject(EngineeringExperienceSquad);  // Eng Xp, because we maintain hardcoded value for it
  });

  it('findTeamByName', async () => {
    expect(await sut.findTeamByName(EngineeringExperienceSquad.name)).toMatchObject(EngineeringExperienceSquad);  // Eng Xp, because we maintain hardcoded value for it
  });
});
