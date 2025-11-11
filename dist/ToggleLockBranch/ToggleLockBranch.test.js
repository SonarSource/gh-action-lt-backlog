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
const ToggleLockBranch_1 = require("./ToggleLockBranch");
const LogTester_1 = require("../tests/LogTester");
const OctokitRestStub_1 = require("../tests/OctokitRestStub");
function sendGraphQLStub(query) {
    const graphQL = [
        {
            name: 'list branch protection rules',
            query: `
        query {
          repository(owner: "test-owner", name: "test-repo") {
            branchProtectionRules(first: 100) {
              nodes {
                id
                lockBranch
                pattern
              }
            }
          }
        }`,
            response: {
                repository: {
                    branchProtectionRules: {
                        nodes: [
                            { id: 'id-of-feature-11', lockBranch: false, pattern: 'feature/*' },
                            { id: 'id-of-locked-222', lockBranch: true, pattern: 'locked' },
                            { id: 'id-of-unlocked-3', lockBranch: false, pattern: 'unlocked' },
                        ]
                    },
                },
            }
        },
        {
            name: 'updateBranchProtectionRule to lock id-of-unlocked-3',
            query: `
        mutation {
          updateBranchProtectionRule(input:{
            branchProtectionRuleId: "id-of-unlocked-3",
            lockBranch: true
          })
          {
            branchProtectionRule {
              id
              lockBranch
              pattern
            }
          }
        }`,
            response: {
                updateBranchProtectionRule: {
                    branchProtectionRule: { id: 'id-of-unlocked-3', lockBranch: true, pattern: 'unlocked' }
                }
            }
        },
        {
            name: 'updateBranchProtectionRule to unlock id-of-locked-222',
            query: `
        mutation {
          updateBranchProtectionRule(input:{
            branchProtectionRuleId: "id-of-locked-222",
            lockBranch: false
          })
          {
            branchProtectionRule {
              id
              lockBranch
              pattern
            }
          }
        }`,
            response: {
                updateBranchProtectionRule: {
                    branchProtectionRule: { id: 'id-of-locked-222', lockBranch: false, pattern: 'locked' }
                }
            }
        },
        {
            name: 'list open pullrequests, page 1',
            query: `
        query {
          repository(owner: "test-owner", name: "test-repo") {
            pullRequests(first: 100, after: "", states: OPEN, baseRefName:"locked"){
              nodes {
                id
                number
                autoMergeRequest { commitHeadline } # We don't need commitHeadline, but GraphQL syntax requires to query something there
              }
              pageInfo {
                endCursor
                hasNextPage
              }
            }
          }
        }`,
            response: {
                repository: {
                    pullRequests: {
                        nodes: [
                            { id: 'pr-11', number: 11, autoMergeRequest: null },
                            { id: 'pr-12', number: 12, autoMergeRequest: { commitHeadline: 'Auto-merge PR #12' } }
                        ],
                        pageInfo: { endCursor: "end-of-page-1", hasNextPage: true }
                    },
                },
            }
        },
        {
            name: 'list open pullrequests, page 2',
            query: `
        query {
          repository(owner: "test-owner", name: "test-repo") {
            pullRequests(first: 100, after: "end-of-page-1", states: OPEN, baseRefName:"locked"){
              nodes {
                id
                number
                autoMergeRequest { commitHeadline } # We don't need commitHeadline, but GraphQL syntax requires to query something there
              }
              pageInfo {
                endCursor
                hasNextPage
              }
            }
          }
        }`,
            response: {
                repository: {
                    pullRequests: {
                        nodes: [
                            { id: 'pr-21', number: 21, autoMergeRequest: { commitHeadline: 'Auto-merge PR #21' } },
                            { id: 'pr-22', number: 22, autoMergeRequest: null }
                        ],
                        pageInfo: { endCursor: "end-of-page-2", hasNextPage: false }
                    }
                }
            }
        },
        {
            name: 'disablePullRequestAutoMerge for pr-12',
            query: `
        mutation {
          disablePullRequestAutoMerge(input: { pullRequestId: "pr-12" } )
          {
            pullRequest { id }
          }
        }`,
            response: {}
        },
        {
            name: 'disablePullRequestAutoMerge for pr-21',
            query: `
        mutation {
          disablePullRequestAutoMerge(input: { pullRequestId: "pr-21" } )
          {
            pullRequest { id }
          }
        }`,
            response: {}
        },
    ];
    const trimmedQuery = query.replace(/^\s+/gm, '');
    const request = graphQL.find(x => x.query.replace(/^\s+/gm, '') === trimmedQuery);
    if (request) {
        console.log(`Invoked sendGraphQL ${request.name}`);
        return request.response;
    }
    else {
        throw new Error(`Unexpected query:\n${query}`);
    }
}
async function runAction() {
    const action = new ToggleLockBranch_1.ToggleLockBranch();
    action.sendGraphQL = sendGraphQLStub;
    action.rest = (0, OctokitRestStub_1.createOctokitRestStub)("Irrelevant");
    action.sendSlackPost = async function (url, jsonRequest) {
        console.log(`Invoked sendSlackPost('${url}', ${JSON.stringify(jsonRequest)}`);
        return {};
    };
    await action.run();
}
describe('ToggleLockBranch', () => {
    let logTester;
    beforeEach(() => {
        logTester = new LogTester_1.LogTester();
        process.env['GITHUB_REPOSITORY'] = 'test-owner/test-repo';
        process.env['INPUT_GITHUB-TOKEN'] = 'fake';
    });
    afterEach(() => {
        logTester.afterEach();
    });
    it('Missing branch protection', async () => {
        process.env['INPUT_BRANCH-PATTERN'] = 'nonexistent';
        await runAction();
        expect(logTester.logsParams).toStrictEqual([
            "Invoked sendGraphQL list branch protection rules",
            "Branch protection rule with pattern 'nonexistent' does not exist.",
            "Done"
        ]);
    });
    it('Lock unlocked without slack', async () => {
        process.env['INPUT_BRANCH-PATTERN'] = 'unlocked';
        await runAction();
        expect(logTester.logsParams).toStrictEqual([
            "Invoked sendGraphQL list branch protection rules",
            "Invoked sendGraphQL updateBranchProtectionRule to lock id-of-unlocked-3",
            "Done: test-repo: The branch `unlocked` was locked :ice_cube:",
            "Skip sending slack message, channel was not set.",
            "Done"
        ]);
    });
    it('Lock unlocked with slack', async () => {
        process.env['INPUT_BRANCH-PATTERN'] = 'unlocked';
        process.env['INPUT_SLACK-CHANNEL'] = 'channel-name';
        await runAction();
        expect(logTester.logsParams).toStrictEqual([
            "Invoked sendGraphQL list branch protection rules",
            "Invoked sendGraphQL updateBranchProtectionRule to lock id-of-unlocked-3", "Done: test-repo: The branch `unlocked` was locked :ice_cube:",
            "Sending Slack message",
            "Invoked sendSlackPost('https://slack.com/api/chat.postMessage', {\"channel\":\"channel-name\",\"text\":\"test-repo: The branch `unlocked` was locked :ice_cube:\"}",
            "Done"
        ]);
    });
    it('Unlock locked and cancel auto-merge', async () => {
        process.env['INPUT_BRANCH-PATTERN'] = 'locked';
        process.env['INPUT_SLACK-CHANNEL'] = 'channel-name';
        await runAction();
        expect(logTester.logsParams).toStrictEqual([
            "Invoked sendGraphQL list branch protection rules",
            "Canceling auto-merge for branch 'locked'",
            "Invoked sendGraphQL list open pullrequests, page 1",
            "Invoked sendGraphQL list open pullrequests, page 2",
            "Found 4 PRs targeting locked, and 2 with auto-merge.",
            "Canceling auto-merge for PR #12",
            "Invoked sendGraphQL disablePullRequestAutoMerge for pr-12",
            "Invoked rest.issues.createComment({\"owner\":\"test-owner\",\"repo\":\"test-repo\",\"issue_number\":12,\"body\":\"The target branch was unlocked and auto-merge was canceled to prevent unexpected actions.\"})",
            "Canceling auto-merge for PR #21",
            "Invoked sendGraphQL disablePullRequestAutoMerge for pr-21",
            "Invoked rest.issues.createComment({\"owner\":\"test-owner\",\"repo\":\"test-repo\",\"issue_number\":21,\"body\":\"The target branch was unlocked and auto-merge was canceled to prevent unexpected actions.\"})",
            "Invoked sendGraphQL updateBranchProtectionRule to unlock id-of-locked-222",
            "Done: test-repo: The branch `locked` was unlocked and is now open for changes :sunny:",
            "Sending Slack message",
            "Invoked sendSlackPost('https://slack.com/api/chat.postMessage', {\"channel\":\"channel-name\",\"text\":\"test-repo: The branch `locked` was unlocked and is now open for changes :sunny:\"}",
            "Done"
        ]);
    });
});
//# sourceMappingURL=ToggleLockBranch.test.js.map