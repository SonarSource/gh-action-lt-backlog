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
function createAction(senderAccountId) {
    return {
        async loadSenderAccountId() {
            if (senderAccountId === undefined) {
                throw new Error('This method was not expected to be called');
            }
            else {
                return senderAccountId;
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
            expect(await TeamReviewData.create(createAction('1234-account'), createSimpleTeam('platform-cloud-eng-squad'))).toEqual({ accountId: '1234-account', team: CloudEngineeringSquad, "name": "platform-cloud-eng-squad" });
        });
        it('platform-cloud-eng-squad, user not found in Jira', async () => {
            expect(await TeamReviewData.create(createAction(null), createSimpleTeam('platform-cloud-eng-squad'))).toEqual({ accountId: null, team: CloudEngineeringSquad, "name": "platform-cloud-eng-squad" });
        });
        it('platform-cloud-prod-eng-squad', async () => {
            expect(await TeamReviewData.create(createAction('1234-account'), createSimpleTeam('platform-cloud-prod-eng-squad'))).toEqual({ accountId: '1234-account', team: CloudProductionEngineeringSquad, "name": "platform-cloud-prod-eng-squad" });
        });
        it('another team', async () => {
            expect(await TeamReviewData.create(createAction(undefined), createSimpleTeam('another-team'))).toBeNull();
        });
        it('null team', async () => {
            expect(await TeamReviewData.create(createAction(undefined), null)).toBeNull();
        });
    });
});
//# sourceMappingURL=TeamReviewData.test.js.map