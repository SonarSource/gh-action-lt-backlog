/*
 * Backlog Automation
 * Copyright (C) SonarSource Sàrl
 * mailto: info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 3 of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with this program; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { JiraTeams } from '../Data/TeamConfiguration.js';
import { TeamReviewData } from '../lib/TeamReviewData.js';
import { SimpleTeam, SimpleUser } from './OctokitTypes.js';
import { LogTester } from '../tests/LogTester.js';
import { OctokitAction } from './OctokitAction.js';
import { context } from '@actions/github';

function createSimpleTeam(name: string): SimpleTeam {
  return { name, slug: name } as SimpleTeam;
}

function createAction(senderLogin: string | null, senderAccountId: string | null | undefined): OctokitAction {
  const sender = senderLogin ? { login: senderLogin, type: 'User' } : undefined;
  return {
    payload: { sender } as typeof context.payload,
    jira: {
      async findAccountId(emails: string[]): Promise<string | null> {
        for (const email of emails) {
          switch (email) {
            case 'cloud.engineering@sonarsource.com':
              return 'cloud-engineering-triagger';
            case 'cloud.production.engineering@sonarsource.com':
              return 'cloud-production-engineering-triagger';
            case 'eng.xp@sonarsource.com':
              return 'eng-xp-triagger';
            case 'front-end.engineering@sonarsource.com':
              return 'front-end-engineering-triagger';
            default:
              throw new Error(`Scaffolding did not expect email: ${email}`);
          }
        }
        return null;
      }
    },
    async loadSenderAccountId(): Promise<string | null> {
      if (senderAccountId === undefined) {
        throw new Error('This method was not expected to be called')
      } else {
        return senderAccountId;
      }
    },
    async listTeamMembers(teamSlug: string): Promise<SimpleUser[]> {
      switch (teamSlug) {
        case 'platform-cloud-eng-squad':
          return [
            { login: 'cloud-user-1', type: 'User' } as SimpleUser,
            { login: 'cloud-user-2', type: 'User' } as SimpleUser
          ];
        case 'platform-cloud-prod-eng-squad':
          return [
            { login: 'cloud-prod-user-1', type: 'User' } as SimpleUser,
            { login: 'cloud-prod-user-2', type: 'User' } as SimpleUser
          ];
        case 'platform-front-end-eng-squad':
          return [
            { login: 'front-end-user-1', type: 'User' } as SimpleUser,
            { login: 'front-end-user-2', type: 'User' } as SimpleUser
          ];
        default:
          throw new Error(`Scaffolding did not expect teamSlug: ${teamSlug}`);
      }
    },
    async findRootlyOnCallEmails(scheduleId: string): Promise<string[]> {
      switch (scheduleId) {
        case 'a8f6f785-aea9-4647-8200-f249dfd5fa70':
          return ['cloud.engineering@sonarsource.com']
        case '70205800-ac28-48cd-a45e-b2e56f01edc9':
          return ['cloud.production.engineering@sonarsource.com']
        case '340d3bc8-9b6c-43fc-856a-e44bec97ebc8':
          return ['eng.xp@sonarsource.com']
        case '2091132b-a81b-4c6c-80ea-8d4ea74227af':
          return ['front-end.engineering@sonarsource.com']
        default:
          if (scheduleId === null) {
            return [];
          } else {
            throw new Error(`Scaffolding did not expect scheduleId: ${scheduleId}`);
          }
      }
    },
  } as OctokitAction;
}

describe('TeamReviewData', () => {
  let logTester: LogTester;

  beforeEach(() => {
    logTester = new LogTester();
  });

  afterEach(() => {
    logTester?.afterEach();
  });

  describe('create', () => {
    it('platform-cloud-eng-squad, user found in Jira', async () => {
      const gitHubTeam = createSimpleTeam('platform-cloud-eng-squad');
      expect(await TeamReviewData.create(createAction('some-login', '1234-account'), 'SC-1234', gitHubTeam))
        .toEqual({ createReviewTicket: true, senderAccountId: '1234-account', assigneeAccountId: 'cloud-engineering-triagger', jiraTeam: JiraTeams.CloudEngineering, gitHubTeam });
    });

    it('platform-cloud-eng-squad, user not found in Jira', async () => {
      const action = createAction('some-login', null);
      action.jira.findAccountId = async () => null; 
      const gitHubTeam = createSimpleTeam('platform-cloud-eng-squad');
      expect(await TeamReviewData.create(action, 'SC-1234', gitHubTeam))
        .toEqual({ createReviewTicket: true, senderAccountId: null, assigneeAccountId: null, jiraTeam: JiraTeams.CloudEngineering, gitHubTeam });
    });

    it('platform-cloud-prod-eng-squad', async () => {
      const gitHubTeam = createSimpleTeam('platform-cloud-prod-eng-squad');
      expect(await TeamReviewData.create(createAction('some-login', '1234-account'), 'SC-1234', gitHubTeam))
        .toEqual({ createReviewTicket: true, senderAccountId: '1234-account', assigneeAccountId: 'cloud-production-engineering-triagger', jiraTeam: JiraTeams.CloudProductionEngineering, gitHubTeam });
    });

    it('platform-front-end-eng-squad', async () => {
      const gitHubTeam = createSimpleTeam('platform-front-end-eng-squad');
      expect(await TeamReviewData.create(createAction('some-login', '1234-account'), 'SC-1234', gitHubTeam))
        .toEqual({ createReviewTicket: true, senderAccountId: '1234-account', assigneeAccountId: 'front-end-engineering-triagger', jiraTeam: JiraTeams.FrontEndEngineering, gitHubTeam });
    });

    it('eng-xp-squad PREQ', async () => {
      const gitHubTeam = createSimpleTeam('platform-eng-xp-squad');
      expect(await TeamReviewData.create(createAction('some-login', '1234-account'), 'PREQ-1234', gitHubTeam))
        .toEqual({ createReviewTicket: false, senderAccountId: '1234-account', assigneeAccountId: 'eng-xp-triagger', jiraTeam: JiraTeams.EngineeringExperience, gitHubTeam });
    });

    it('eng-xp-squad BUILD', async () => {
      const gitHubTeam = createSimpleTeam('platform-eng-xp-squad');
      expect(await TeamReviewData.create(createAction('some-login', '1234-account'), 'BUILD-1234', gitHubTeam))
        .toEqual({ createReviewTicket: false, senderAccountId: '1234-account', assigneeAccountId: null, jiraTeam: JiraTeams.EngineeringExperience, gitHubTeam });
    });

    it('another team', async () => {
      expect(await TeamReviewData.create(createAction('some-login', undefined), 'SC-1234', createSimpleTeam('another-team'))).toBeNull();
    });

    it('null team', async () => {
      expect(await TeamReviewData.create(createAction('some-login', undefined), 'SC-1234', null)).toBeNull();
    });

    it.each([
      { team: 'platform-cloud-eng-squad', user: 'cloud-user-2' },
      { team: 'platform-cloud-eng-squad', user: 'cloud-prod-user-2' },
      { team: 'platform-cloud-prod-eng-squad', user: 'cloud-user-2' },
      { team: 'platform-cloud-prod-eng-squad', user: 'cloud-prod-user-2' },
      { team: 'platform-front-end-eng-squad', user: 'front-end-user-2' },
    ])('null for $user from the same team $team', async ({ team, user }) => {
      expect(await TeamReviewData.create(createAction(user, undefined), 'SC-1234', createSimpleTeam(team))).toBeNull();
    });
  });
});
