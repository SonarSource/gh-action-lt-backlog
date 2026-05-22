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
import { LogTester } from '../tests/LogTester.js';
function createSimpleTeam(name) {
    return { name };
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
            expect(await TeamReviewData.createFromUser(createSimpleTeam('platform-cloud-eng-squad'), async () => '1234-account')).toEqual({ accountId: '1234-account', team: CloudEngineeringSquad });
        });
        it('platform team, user not found in Jira', async () => {
            expect(await TeamReviewData.createFromUser(createSimpleTeam('platform-cloud-eng-squad'), async () => null)).toEqual({ accountId: null, team: CloudEngineeringSquad });
        });
        it('another team', async () => {
            expect(await TeamReviewData.createFromUser(createSimpleTeam('another-team'), async () => { throw new Error('This should not be called'); })).toBeNull();
        });
        it('null team', async () => {
            expect(await TeamReviewData.createFromUser(null, async () => { throw new Error('This should not be called'); })).toBeNull();
        });
    });
});
//# sourceMappingURL=TeamReviewData.test.js.map