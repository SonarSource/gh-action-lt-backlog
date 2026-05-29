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
import { LogTester } from '../tests/LogTester.js';
function createSimpleTeam(name) {
    return { name, slug: name };
}
function createAction(senderLogin, senderAccountId) {
    const sender = senderLogin ? { login: senderLogin, type: 'User' } : undefined;
    return {
        payload: { sender },
        async loadSenderAccountId() {
            if (senderAccountId === undefined) {
                throw new Error('This method was not expected to be called');
            }
            else {
                return senderAccountId;
            }
        },
        async listTeamMembers(teamSlug) {
            switch (teamSlug) {
                case 'platform-cloud-eng-squad':
                    return [
                        { login: 'cloud-user-1', type: 'User' },
                        { login: 'cloud-user-2', type: 'User' }
                    ];
                case 'platform-cloud-prod-eng-squad':
                    return [
                        { login: 'cloud-prod-user-1', type: 'User' },
                        { login: 'cloud-prod-user-2', type: 'User' }
                    ];
                default:
                    throw new Error(`Scaffolding did not expect teamSlug: ${teamSlug}`);
            }
        }
    };
}
describe('TeamReviewData', () => {
    let logTester;
    beforeEach(() => {
        logTester = new LogTester();
    });
    afterEach(() => {
        logTester?.afterEach();
    });
    describe('create', () => {
        it('platform-cloud-eng-squad, user found in Jira', async () => {
            const gitHubTeam = createSimpleTeam('platform-cloud-eng-squad');
            expect(await TeamReviewData.create(createAction('some-login', '1234-account'), gitHubTeam)).toEqual({ accountId: '1234-account', jiraTeam: JiraTeams.CloudEngineering, gitHubTeam });
        });
        it('platform-cloud-eng-squad, user not found in Jira', async () => {
            const gitHubTeam = createSimpleTeam('platform-cloud-eng-squad');
            expect(await TeamReviewData.create(createAction('some-login', null), gitHubTeam)).toEqual({ accountId: null, jiraTeam: JiraTeams.CloudEngineering, gitHubTeam });
        });
        it('platform-cloud-prod-eng-squad', async () => {
            const gitHubTeam = createSimpleTeam('platform-cloud-prod-eng-squad');
            expect(await TeamReviewData.create(createAction('some-login', '1234-account'), gitHubTeam)).toEqual({ accountId: '1234-account', jiraTeam: JiraTeams.CloudProductionEngineering, gitHubTeam });
        });
        it('another team', async () => {
            expect(await TeamReviewData.create(createAction('some-login', undefined), createSimpleTeam('another-team'))).toBeNull();
        });
        it('null team', async () => {
            expect(await TeamReviewData.create(createAction('some-login', undefined), null)).toBeNull();
        });
        it.each([
            { team: 'platform-cloud-eng-squad', user: 'cloud-user-2' },
            { team: 'platform-cloud-eng-squad', user: 'cloud-prod-user-2' },
            { team: 'platform-cloud-prod-eng-squad', user: 'cloud-user-2' },
            { team: 'platform-cloud-prod-eng-squad', user: 'cloud-prod-user-2' },
        ])('null for $user from the same team $team', async ({ team, user }) => {
            expect(await TeamReviewData.create(createAction(user, undefined), createSimpleTeam(team))).toBeNull();
        });
    });
});
//# sourceMappingURL=TeamReviewData.test.js.map