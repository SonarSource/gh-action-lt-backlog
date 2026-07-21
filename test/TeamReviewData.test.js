import { assertEqual } from './support/Assertions.js';
import { afterEach, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert';
import { JiraTeams } from '../src/helpers/TeamConfiguration.js';
import { TeamReviewData } from '../src/helpers/TeamReviewData.js';
import { LogTester } from './support/LogTester.js';
function createPullRequest(title) {
  return {
    number: 42,
    title,
    isRenovate() {
      return false;
    },
    isDependabot() {
      return false;
    },
    isBot() {
      return title === 'Bot PR';
    },
  };
}
function createSimpleTeam(name) {
  return { name, slug: name };
}
function createAction(senderLogin, senderAccountId) {
  const sender = senderLogin ? { login: senderLogin, type: 'User' } : undefined;
  return {
    payload: { sender },
    jira: {
      async findAccountId(emails) {
        for (const email of emails) {
          switch (email) {
            case 'cloud.engineering@sonarsource.com':
              return 'cloud-engineering-triager';
            case 'cloud.production.engineering@sonarsource.com':
              return 'cloud-production-engineering-triager';
            case 'eng.xp@sonarsource.com':
              return 'eng-xp-triager';
            case 'front-end.engineering@sonarsource.com':
              return 'front-end-engineering-triager';
            default:
              throw new Error(`Scaffolding did not expect email: ${email}`);
          }
        }
        return null;
      },
    },
    async loadSenderAccountId() {
      if (senderAccountId === undefined) {
        throw new Error('This method was not expected to be called');
      } else {
        return senderAccountId;
      }
    },
    async listTeamMembers(teamSlug) {
      switch (teamSlug) {
        case 'platform-cloud-eng-squad':
          return [
            { login: 'cloud-user-1', type: 'User' },
            { login: 'cloud-user-2', type: 'User' },
          ];
        case 'platform-cloud-prod-eng-squad':
          return [
            { login: 'cloud-prod-user-1', type: 'User' },
            { login: 'cloud-prod-user-2', type: 'User' },
          ];
        case 'platform-front-end-eng-squad':
          return [
            { login: 'front-end-user-1', type: 'User' },
            { login: 'front-end-user-2', type: 'User' },
          ];
        default:
          throw new Error(`Scaffolding did not expect teamSlug: ${teamSlug}`);
      }
    },
    async findRootlyOnCallEmails(scheduleId) {
      switch (scheduleId) {
        case 'a8f6f785-aea9-4647-8200-f249dfd5fa70':
          return ['cloud.engineering@sonarsource.com'];
        case '70205800-ac28-48cd-a45e-b2e56f01edc9':
          return ['cloud.production.engineering@sonarsource.com'];
        case '340d3bc8-9b6c-43fc-856a-e44bec97ebc8':
          return ['eng.xp@sonarsource.com'];
        case '2091132b-a81b-4c6c-80ea-8d4ea74227af':
          return ['front-end.engineering@sonarsource.com'];
        default:
          if (scheduleId === null) {
            return [];
          } else {
            throw new Error(`Scaffolding did not expect scheduleId: ${scheduleId}`);
          }
      }
    },
  };
}
describe('TeamReviewData', () => {
  let logTester;
  const normalPR = createPullRequest('Normal PR');
  beforeEach(() => {
    logTester = new LogTester();
  });
  afterEach(() => {
    logTester?.afterEach();
  });
  describe('create', () => {
    it('platform-cloud-eng-squad, user found in Jira', async () => {
      const gitHubTeam = createSimpleTeam('platform-cloud-eng-squad');
      assertEqual(
        await TeamReviewData.create(
          createAction('some-login', '1234-account'),
          normalPR,
          'SC-1234',
          gitHubTeam,
        ),
        {
          createReviewTicket: true,
          senderAccountId: '1234-account',
          assigneeAccountId: 'cloud-engineering-triager',
          jiraTeam: JiraTeams.CloudEngineering,
          gitHubTeam,
        },
      );
    });
    it('platform-cloud-eng-squad, user not found in Jira', async () => {
      const action = createAction('some-login', null);
      action.jira.findAccountId = async () => null;
      const gitHubTeam = createSimpleTeam('platform-cloud-eng-squad');
      assertEqual(await TeamReviewData.create(action, normalPR, 'SC-1234', gitHubTeam), {
        createReviewTicket: true,
        senderAccountId: null,
        assigneeAccountId: null,
        jiraTeam: JiraTeams.CloudEngineering,
        gitHubTeam,
      });
    });
    it('platform-cloud-prod-eng-squad', async () => {
      const gitHubTeam = createSimpleTeam('platform-cloud-prod-eng-squad');
      assertEqual(
        await TeamReviewData.create(
          createAction('some-login', '1234-account'),
          normalPR,
          'SC-1234',
          gitHubTeam,
        ),
        {
          createReviewTicket: true,
          senderAccountId: '1234-account',
          assigneeAccountId: 'cloud-production-engineering-triager',
          jiraTeam: JiraTeams.CloudProductionEngineering,
          gitHubTeam,
        },
      );
    });
    it('platform-front-end-eng-squad', async () => {
      const gitHubTeam = createSimpleTeam('platform-front-end-eng-squad');
      assertEqual(
        await TeamReviewData.create(
          createAction('some-login', '1234-account'),
          normalPR,
          'SC-1234',
          gitHubTeam,
        ),
        {
          createReviewTicket: true,
          senderAccountId: '1234-account',
          assigneeAccountId: 'front-end-engineering-triager',
          jiraTeam: JiraTeams.FrontEndEngineering,
          gitHubTeam,
        },
      );
    });
    it('eng-xp-squad PREQ', async () => {
      const gitHubTeam = createSimpleTeam('platform-eng-xp-squad');
      assertEqual(
        await TeamReviewData.create(
          createAction('some-login', '1234-account'),
          normalPR,
          'PREQ-1234',
          gitHubTeam,
        ),
        {
          createReviewTicket: false,
          senderAccountId: '1234-account',
          assigneeAccountId: 'eng-xp-triager',
          jiraTeam: JiraTeams.EngineeringExperience,
          gitHubTeam,
        },
      );
    });
    it('eng-xp-squad BUILD', async () => {
      const gitHubTeam = createSimpleTeam('platform-eng-xp-squad');
      assertEqual(
        await TeamReviewData.create(
          createAction('some-login', '1234-account'),
          normalPR,
          'BUILD-1234',
          gitHubTeam,
        ),
        {
          createReviewTicket: false,
          senderAccountId: '1234-account',
          assigneeAccountId: null,
          jiraTeam: JiraTeams.EngineeringExperience,
          gitHubTeam,
        },
      );
    });
    it('another team', async () => {
      assert.strictEqual(
        await TeamReviewData.create(
          createAction('some-login', undefined),
          normalPR,
          'SC-1234',
          createSimpleTeam('another-team'),
        ),
        null,
      );
    });
    it('null team', async () => {
      assert.strictEqual(
        await TeamReviewData.create(
          createAction('some-login', undefined),
          normalPR,
          'SC-1234',
          null,
        ),
        null,
      );
    });
    for (const { team, user } of [
      { team: 'platform-cloud-eng-squad', user: 'cloud-user-2' },
      { team: 'platform-cloud-eng-squad', user: 'cloud-prod-user-2' },
      { team: 'platform-cloud-prod-eng-squad', user: 'cloud-user-2' },
      { team: 'platform-cloud-prod-eng-squad', user: 'cloud-prod-user-2' },
      { team: 'platform-front-end-eng-squad', user: 'front-end-user-2' },
    ]) {
      it(`null for ${user} from the same team ${team}`, async () => {
        assert.strictEqual(
          await TeamReviewData.create(
            createAction(user, undefined),
            normalPR,
            'SC-1234',
            createSimpleTeam(team),
          ),
          null,
        );
      });
    }
    for (const team of [
      'platform-cloud-eng-squad',
      'platform-cloud-prod-eng-squad',
      'platform-front-end-eng-squad',
    ]) {
      it(`bot PRs do not create review PRs for ${team}`, async () => {
        const result = await TeamReviewData.create(
          createAction('any-bot[bot]', null),
          createPullRequest('Bot PR'),
          'SC-1234',
          createSimpleTeam(team),
        );
        assert.notStrictEqual(result, null);
        assert.strictEqual(result.createReviewTicket, false);
        assert.ok(
          [
            'cloud-engineering-triager',
            'cloud-production-engineering-triager',
            'front-end-engineering-triager',
          ].includes(result.assigneeAccountId),
        );
      });
    }
  });
});
