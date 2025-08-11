import { ToggleLockBranch } from './ToggleLockBranch';
import { LogTester } from '../tests/LogTester';
import { createOctokitRestStub } from '../tests/OctokitRestStub';
import { OctokitActionStub } from '../tests/OctokitActionStub';

function sendGraphQLStub(query: string): any {
  const graphQL: { name: string, query: string, response: any }[] = [
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
  } else {
    throw new Error(`Unexpected query:\n${query}`)
  }
}

async function runAction(): Promise<void> {
  const action = new ToggleLockBranch() as ToggleLockBranch & OctokitActionStub;
  action.sendGraphQL = sendGraphQLStub;
  action.rest = createOctokitRestStub("Irrelevant");
  action.sendSlackPost = async function (url: string, jsonRequest: any): Promise<any> {
    console.log(`Invoked sendSlackPost('${url}', ${JSON.stringify(jsonRequest)}`)
    return {};
  }
  await action.run();
}

describe('ToggleLockBranch', () => {
  let logTester: LogTester;

  beforeEach(() => {
    logTester = new LogTester();
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
