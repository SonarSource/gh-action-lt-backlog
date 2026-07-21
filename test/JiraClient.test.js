import { afterEach, before, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert';
import { assertCalledWith, assertCalledWithMatch } from './support/Assertions.js';
import { AtlassianDocument } from '../src/helpers/AtlassianDocumentFormat.js';
import { JiraClient } from '../src/helpers/JiraClient.js';
import { JiraTeams, TeamConfigurationData } from '../src/helpers/TeamConfiguration.js';
import { Config } from '../src/helpers/Configuration.js';
import { LogTester } from './support/LogTester.js';
import { JIRA_DOMAIN, JIRA_SITE_ID, JIRA_ORGANIZATION_ID } from '../src/helpers/Constants.js';
const sandboxDomain = 'https://sonarsource-sandbox-608.atlassian.net';
const sandboxSiteId = '5ea71b8c-f3d5-4b61-b038-001c50df1666';
const sandboxOrganizationId = '78eed3e4-84ad-4374-b777-a3b4ba5d9516';
let sut;
let productionSut;
let issueId;
let preqIssueId;
before(async () => {
  const user = process.env['JIRA_USER']; // Can't use the same name as environment variables read by Octokit actions, because the dash is not propagated from shell to node
  const token = process.env['JIRA_TOKEN'];
  if (user && token) {
    sut = new JiraClient(sandboxDomain, sandboxSiteId, sandboxOrganizationId, user, token);
    productionSut = new JiraClient(JIRA_DOMAIN, JIRA_SITE_ID, JIRA_ORGANIZATION_ID, user, token);
    const parameters = { issuetype: { name: 'Feature' } };
    issueId = await sut.createIssue(
      'GHA',
      `JiraClient unit test shared ${crypto.randomUUID()}`,
      parameters,
    );
  } else {
    assert.fail(
      'JiraClient tests require JIRA_USER and JIRA_TOKEN environment variables to be set.',
    );
  }
});
async function findFirstActiveSprintId() {
  for (const team of TeamConfigurationData) {
    const sprintId = await sut.findSprintId(team.boardId);
    if (sprintId) {
      return sprintId;
    }
  }
  assert.fail('Scaffolding: Could not find any active sprint ID');
}
async function ensurePreqIssueId() {
  if (!preqIssueId) {
    const parameters = { issuetype: { name: 'Maintenance' } };
    preqIssueId = await sut.createIssue(
      'PREQ',
      `JiraClient unit test PREQ ${crypto.randomUUID()}`,
      parameters,
    );
  }
  return preqIssueId;
}
describe('JiraClient', () => {
  let logTester;
  beforeEach(() => {
    logTester = new LogTester();
  });
  afterEach(() => {
    logTester?.afterEach(); // When before fails, beforeEach is not called, but afterEach is.
  });
  it('handles errors', async () => {
    const withoutToken = new JiraClient(
      sandboxDomain,
      sandboxSiteId,
      sandboxOrganizationId,
      'wrong',
      'token',
    );
    const result = await withoutToken.loadIssue('TEST-42');
    assert.strictEqual(result, null);
    assertCalledWith(
      logTester.logSpy,
      '404 (Not Found): Issue does not exist or you do not have permission to see it.',
    );
    assertCalledWith(
      logTester.logSpy,
      `{
  "errorMessages": [
    "Issue does not exist or you do not have permission to see it."
  ],
  "errors": {}
}`,
    );
  });
  it('createIssue', async () => {
    const summary = `JiraClient unit test createIssue ${crypto.randomUUID()}`;
    const sprintId = await findFirstActiveSprintId();
    const team = await sut.findTeamByName('.NET Squad'); // Sandbox has different team IDs than production instance
    // The GHA project needs to have all of these on it's create screen in production and sandbox, as production overrides the sandbox once in a while
    const parameters = {
      issuetype: { name: 'Feature' },
      labels: ['FirstLabel', 'SecondLabel'],
      parent: { key: 'GHA-37' },
      reporter: { id: '712020:7dcfc909-3fa9-496f-9127-163d8cd0e30f' }, // "Jira Automation". Any user except the "Jira Tech User GitHub" that would be used as a default user assigned by the token
      description: AtlassianDocument.fromMarkdown('Lorem ipsum'),
      customfield_10001: team.id,
      customfield_10020: sprintId, // Patlassian* Sprint IT - needs an active sprint
    };
    const result = await sut.createIssue('GHA', summary, parameters);
    assert.notStrictEqual(result, null);
    assert.ok(result.includes('GHA-'));
    const issue = await sut.loadIssue(result);
    assert.notStrictEqual(issue, null);
    assert.partialDeepStrictEqual(issue.fields, {
      issuetype: { name: 'Feature' },
      labels: ['FirstLabel', 'SecondLabel'],
      parent: { key: 'GHA-37' },
      reporter: { accountId: '712020:7dcfc909-3fa9-496f-9127-163d8cd0e30f' }, // The same thing has two different names in different API calls, of course.
      description: {
        type: 'doc',
        version: 1,
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: 'Lorem ipsum',
              },
            ],
          },
        ],
      },
      customfield_10001: { id: team.id }, // Why would the same field have same structure everywhere anyway?
      customfield_10020: [{ id: sprintId }], // Why would the same field have same structure everywhere anyway?
    });
  });
  it('loadIssue', async () => {
    const result = await sut.loadIssue('GHA-42');
    assert.notStrictEqual(result, null);
    assert.strictEqual(result.key, 'GHA-42');
    assert.notStrictEqual(result.fields, null);
    assert.strictEqual(result.fields.summary, 'Import sonar-dotnet');
  });
  it('loadProject', async () => {
    assert.partialDeepStrictEqual(await sut.loadProject('GHA'), {
      key: 'GHA',
      lead: { accountId: '5dc3f7c6e3cc320c5e8a91f1', displayName: 'Pavel Mikula' },
    });
  });
  it('moveIssue no transition', async () => {
    await sut.moveIssue('GHA-42', 'Hallucinated');
    assertCalledWith(logTester.logSpy, "GHA-42: Could not find the transition 'Hallucinated'");
  });
  it('moveIssue moves issue', async () => {
    await sut.moveIssue(issueId, 'Start');
    assert.strictEqual((await sut.loadIssue(issueId)).fields.status.name, 'In Progress');
  });
  it('findTransition no transition', async () => {
    assert.strictEqual(await sut.findTransition(issueId, 'Hallucinated'), null);
  });
  it('findTransition finds', async () => {
    assert.partialDeepStrictEqual(await sut.findTransition(issueId, 'Cancel Issue'), {
      id: '11',
      name: 'Cancel Issue',
    });
  });
  it('transitionIssue', async () => {
    await sut.moveIssue(issueId, 'Merge');
    assert.strictEqual((await sut.loadIssue(issueId)).fields.status.name, 'Done');
  });
  it('assignIssueToEmail', async () => {
    let issue = await sut.loadIssue(issueId);
    const email =
      issue.fields.assignee?.emailAddress === 'helpdesk+jira-githubtech@sonarsource.com'
        ? 'pavel.mikula@sonarsource.com'
        : 'helpdesk+jira-githubtech@sonarsource.com';
    await sut.assignIssueToEmail(issueId, [email]);
    issue = await sut.loadIssue(issueId);
    assert.strictEqual(issue.fields.assignee?.emailAddress, email);
  });
  it('assignIssueToAccount', async () => {
    let issue = await sut.loadIssue(issueId);
    const accountId =
      issue.fields.assignee?.accountId === '712020:9dcffe4d-55ee-4d69-b5d1-535c6dbd9cc4'
        ? '5dc3f7c6e3cc320c5e8a91f1'
        : '712020:9dcffe4d-55ee-4d69-b5d1-535c6dbd9cc4';
    await sut.assignIssueToAccount(issueId, accountId);
    issue = await sut.loadIssue(issueId);
    assert.strictEqual(issue.fields.assignee?.accountId, accountId);
  });
  it('addReviewer', async () => {
    const issueId = await ensurePreqIssueId();
    await sut.addReviewer(issueId, ['helpdesk+jira-githubtech@sonarsource.com']);
    let issue = await sut.loadIssue(issueId);
    assert.partialDeepStrictEqual(issue.fields.customfield_11227, [
      { emailAddress: 'helpdesk+jira-githubtech@sonarsource.com' },
    ]);
    // Second call does not change anything
    await sut.addReviewer(issueId, ['helpdesk+jira-githubtech@sonarsource.com']);
    issue = await sut.loadIssue(issueId);
    assert.partialDeepStrictEqual(issue.fields.customfield_11227, [
      { emailAddress: 'helpdesk+jira-githubtech@sonarsource.com' },
    ]);
  });
  it('addReviewedBy', async () => {
    const issueId = await ensurePreqIssueId();
    await sut.addReviewedBy(issueId, ['helpdesk+jira-githubtech@sonarsource.com']);
    let issue = await sut.loadIssue(issueId);
    assert.partialDeepStrictEqual(issue.fields.customfield_11228, [
      { emailAddress: 'helpdesk+jira-githubtech@sonarsource.com' },
    ]);
    // Second call does not change anything
    await sut.addReviewedBy(issueId, ['helpdesk+jira-githubtech@sonarsource.com']);
    issue = await sut.loadIssue(issueId);
    assert.partialDeepStrictEqual(issue.fields.customfield_11228, [
      { emailAddress: 'helpdesk+jira-githubtech@sonarsource.com' },
    ]);
  });
  it('createComponent existing', async () => {
    const name = 'JiraClient UT';
    const result = await sut.createComponent(
      'GHA',
      name,
      'Test component created by JiraClient unit test',
    );
    assert.strictEqual(result, true);
    assertCalledWith(logTester.logSpy, `Searching for component 'JiraClient UT' in project GHA`);
    assertCalledWithMatch(logTester.logSpy, /Component found in \d+ result\(s\)/);
  });
  it('createComponent new', async () => {
    const name = `JiraClient UT  ${crypto.randomUUID()}`;
    const result = await sut.createComponent(
      'GHA',
      name,
      'Test component created by JiraClient unit test',
    );
    assert.strictEqual(result, true);
    assertCalledWith(logTester.logSpy, `Searching for component '${name}' in project GHA`);
    assertCalledWithMatch(
      logTester.logSpy,
      /Component not found in \d+ result\(s\). Creating a new one./,
    );
    const project = await sut.loadProject('GHA');
    const component = project.components.find(x => x.name === name);
    assert.partialDeepStrictEqual(component, {
      name,
      description: 'Test component created by JiraClient unit test',
    });
  });
  it('addIssueComponent', async () => {
    assert.strictEqual(await sut.addIssueComponent(issueId, 'JiraClient UT'), true);
    const issue = await sut.loadIssue(issueId);
    assert.partialDeepStrictEqual(issue.fields.components, [{ name: 'JiraClient UT' }]);
  });
  it('addIssueRemoteLink and loadIssueRemoteLinks', async () => {
    await sut.addIssueRemoteLink(issueId, 'https://www.sonarsource.com/', 'Sonar');
    assert.partialDeepStrictEqual(await sut.loadIssueRemoteLinks(issueId), [
      { object: { url: 'https://www.sonarsource.com/', title: 'Sonar' } },
    ]);
  });
  it('linkIssues', async () => {
    const preqId = await ensurePreqIssueId();
    await sut.linkIssues(issueId, preqId, 'Relates');
    const thisissue = await sut.loadIssue(issueId);
    const linkIssue = await sut.loadIssue(preqId);
    assert.partialDeepStrictEqual(thisissue.fields.issuelinks, [
      { type: { name: 'Relates' }, outwardIssue: { key: preqId } },
    ]);
    assert.partialDeepStrictEqual(linkIssue.fields.issuelinks, [
      { type: { name: 'Relates' }, inwardIssue: { key: issueId } },
    ]);
  });
  it('findAccountId', async () => {
    assert.strictEqual(
      await sut.findAccountId([
        'unknown@sonarsource.com',
        'helpdesk+jira-githubtech@sonarsource.com',
      ]),
      '712020:9dcffe4d-55ee-4d69-b5d1-535c6dbd9cc4',
    );
    assert.deepStrictEqual(logTester.logsParams, [
      'Searching for user: unknown',
      'Could not find user unknown in Jira',
      'Searching for user: helpdesk+jira-githubtech',
      'Found 1 account(s), using 712020:9dcffe4d-55ee-4d69-b5d1-535c6dbd9cc4 Jira Tech User GitHub',
    ]);
  });
  it('findBoard', async () => {
    const boardId = Config.findTeam(JiraTeams.EngineeringExperience.name).boardId;
    assert.notStrictEqual(await sut.findBoard(boardId), null);
  });
  it('findSprintId', async () => {
    const boardId = Config.findTeam(JiraTeams.EngineeringExperience.name).boardId;
    assert.ok((await sut.findSprintId(boardId)) > 0);
  });
  it('findTeamByUser', async () => {
    // This UT needs productionSut, because team IDs are different in sandbox
    const accountId = '557058:f82b4ae5-78e0-4689-9f9e-419b773bf121'; // Thomas Vérin The Greatest, it can be any member of Eng Xp squad Jira team
    assert.partialDeepStrictEqual(await productionSut.findTeamByUser(accountId), {
      ...JiraTeams.EngineeringExperience,
    }); // Eng Xp, because we maintain hardcoded value for it
  });
  it('findTeamByName', async () => {
    // This UT needs productionSut, because team IDs are different in sandbox
    assert.partialDeepStrictEqual(
      await productionSut.findTeamByName(JiraTeams.EngineeringExperience.name),
      {
        ...JiraTeams.EngineeringExperience,
      },
    ); // Eng Xp, because we maintain hardcoded value for it
  });
  it('findIssues', async () => {
    assert.partialDeepStrictEqual(await sut.findIssues('key IN (GHA-1, NET-5) ORDER BY key'), [
      { key: 'GHA-1', fields: { summary: 'Add Jira automation Dogfood' } },
      { key: 'NET-5', fields: { summary: 'Hardening' } },
    ]);
  });
});
