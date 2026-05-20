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
import { CloudEngineeringSquad, CloudProductionEngineeringSquad } from '../Data/TeamConfiguration.js';
import { TeamReviewData } from '../lib/TeamReviewData.js';
import { jiraClientStub } from '../tests/JiraClientStub.js';
import { LogTester } from '../tests/LogTester.js';
function createSimpleTeam(name) {
    return { name };
}
async function findEmails(login) {
    switch (login) {
        case 'user': return ['user@sonarsource.com'];
        case 'unknown': return ['unknown@sonarsource.com'];
        default: throw new Error(`Scaffolding did not expect login ${login}`);
    }
}
describe('TeamReviewData', () => {
    let logTester;
    beforeEach(() => {
        logTester = new LogTester();
    });
    afterEach(() => {
        logTester?.afterEach();
    });
    describe('createFromAccount and selectTeam', () => {
        it('platform-cloud-eng-squad', () => {
            expect(TeamReviewData.createFromAccount(createSimpleTeam('platform-cloud-eng-squad'), '1234-account')).toEqual({ accountId: '1234-account', team: CloudEngineeringSquad });
        });
        it('platform-cloud-prod-eng-squad', () => {
            expect(TeamReviewData.createFromAccount(createSimpleTeam('platform-cloud-prod-eng-squad'), '1234-account')).toEqual({ accountId: '1234-account', team: CloudProductionEngineeringSquad });
        });
        it('another team', () => {
            expect(TeamReviewData.createFromAccount(createSimpleTeam('another-team'), '1234-account')).toBeNull();
        });
        it('undefined team', () => {
            expect(TeamReviewData.createFromAccount(undefined, '1234-account')).toBeNull();
        });
        it('null accountId', () => {
            expect(TeamReviewData.createFromAccount(createSimpleTeam('platform-cloud-eng-squad'), null)).toEqual({ accountId: null, team: CloudEngineeringSquad });
        });
    });
    describe('createFromUser', () => {
        it('platform team, user found in Jira', async () => {
            expect(await TeamReviewData.createFromUser(jiraClientStub, createSimpleTeam('platform-cloud-eng-squad'), 'user', findEmails)).toEqual({ accountId: '1234-account', team: CloudEngineeringSquad });
        });
        it('platform team, user not found in Jira', async () => {
            expect(await TeamReviewData.createFromUser(jiraClientStub, createSimpleTeam('platform-cloud-eng-squad'), 'unknown', findEmails)).toEqual({ accountId: null, team: CloudEngineeringSquad });
        });
        it('another team', async () => {
            expect(await TeamReviewData.createFromUser(jiraClientStub, createSimpleTeam('another-team'), 'user', findEmails)).toBeNull();
        });
        it('null team', async () => {
            expect(await TeamReviewData.createFromUser(jiraClientStub, null, 'user', findEmails)).toBeNull();
        });
    });
});
//# sourceMappingURL=TeamReviewData.test.js.map