"use strict";
/*
 * Backlog Automation
 * Copyright (C) 2022-2025 SonarSource Sàrl
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
Object.defineProperty(exports, "__esModule", { value: true });
const LockBranch_1 = require("./LockBranch");
const LogTester_1 = require("../tests/LogTester");
const OctokitRestStub_1 = require("../tests/OctokitRestStub");
const GraphQLStub_1 = require("../tests/GraphQLStub");
async function runAction() {
    const graphQLStub = (0, GraphQLStub_1.createLockBranchGraphQLStub)();
    const action = new LockBranch_1.LockBranch();
    action.sendGraphQL = (query) => graphQLStub.sendGraphQL(query);
    action.rest = (0, OctokitRestStub_1.createOctokitRestStub)("Irrelevant");
    action.sendSlackPost = async function (url, jsonRequest) {
        console.log(`Invoked sendSlackPost('${url}', ${JSON.stringify(jsonRequest)}`);
        return {};
    };
    await action.run();
}
describe('LockBranch', () => {
    let logTester;
    beforeEach(() => {
        logTester = new LogTester_1.LogTester();
        process.env['GITHUB_REPOSITORY'] = 'test-owner/test-repo';
        process.env['INPUT_GITHUB-TOKEN'] = 'fake';
        process.env['INPUT_SLACK-CHANNEL'] = '';
    });
    afterEach(() => {
        logTester.afterEach();
    });
    it('Missing branch protection', async () => {
        process.env['INPUT_BRANCH-PATTERN'] = 'nonexistent';
        process.env['INPUT_LOCK'] = 'true';
        await runAction();
        expect(logTester.logsParams).toStrictEqual([
            "Invoked sendGraphQL list branch protection rules",
            "Branch protection rule with pattern 'nonexistent' does not exist.",
            "Done"
        ]);
    });
    it('Lock unlocked branch', async () => {
        process.env['INPUT_BRANCH-PATTERN'] = 'unlocked';
        process.env['INPUT_LOCK'] = 'true';
        await runAction();
        expect(logTester.logsParams).toStrictEqual([
            "Invoked sendGraphQL list branch protection rules",
            "Invoked sendGraphQL updateBranchProtectionRule to lock id-of-unlocked-3",
            "Done: test-repo: The branch `unlocked` was locked :ice_cube:",
            "Skip sending slack message, channel was not set.",
            "Done"
        ]);
    });
    it('Unlock locked branch and cancel auto-merge', async () => {
        process.env['INPUT_BRANCH-PATTERN'] = 'locked';
        process.env['INPUT_LOCK'] = 'false';
        process.env['INPUT_SLACK-CHANNEL'] = 'channel-name';
        await runAction();
        expect(logTester.logsParams).toStrictEqual([
            "Invoked sendGraphQL list branch protection rules",
            "Canceling auto-merge for branch 'locked'",
            "Invoked sendGraphQL list open pullrequests, page 1",
            "Found 2 PRs targeting locked, and 1 with auto-merge.",
            "Canceling auto-merge for PR #12",
            "Invoked sendGraphQL disablePullRequestAutoMerge for pr-12",
            "Invoked rest.issues.createComment({\"owner\":\"test-owner\",\"repo\":\"test-repo\",\"issue_number\":12,\"body\":\"The target branch was unlocked and auto-merge was canceled to prevent unexpected actions.\"})",
            "Invoked sendGraphQL updateBranchProtectionRule to unlock id-of-locked-222",
            "Done: test-repo: The branch `locked` was unlocked and is now open for changes :sunny:",
            "Sending Slack message",
            "Invoked sendSlackPost('https://slack.com/api/chat.postMessage', {\"channel\":\"channel-name\",\"text\":\"test-repo: The branch `locked` was unlocked and is now open for changes :sunny:\"}",
            "Done"
        ]);
    });
});
//# sourceMappingURL=LockBranch.test.js.map