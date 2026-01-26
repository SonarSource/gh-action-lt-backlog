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

import { GraphQlQueryResponseData } from '@octokit/graphql';

interface GraphQLStubEntry {
  name: string;
  query: string;
  response: GraphQlQueryResponseData;
}

export class GraphQLStub {
  private readonly stubs: GraphQLStubEntry[] = [];

  addStub(name: string, query: string, response: GraphQlQueryResponseData): this {
    this.stubs.push({ name, query, response });
    return this;
  }

  sendGraphQL(query: string): Promise<GraphQlQueryResponseData> {
    const trimmedQuery = query.replaceAll(/^\s+/gm, '');
    const request = this.stubs.find(x => x.query.replaceAll(/^\s+/gm, '') === trimmedQuery);
    if (request) {
      console.log(`Invoked sendGraphQL ${request.name}`);
      return Promise.resolve(request.response);
    } else {
      throw new Error(`Unexpected query:\n${query}`);
    }
  }
}

export function createLockBranchGraphQLStub(hasNextPage: boolean = false): GraphQLStub {
  const stub = new GraphQLStub();

  stub.addStub('list branch protection rules', `
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
    {
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
  );

  stub.addStub('updateBranchProtectionRule to lock id-of-unlocked-3', `
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
    {
      updateBranchProtectionRule: {
        branchProtectionRule: { id: 'id-of-unlocked-3', lockBranch: true, pattern: 'unlocked' }
      }
    }
  );

  stub.addStub('updateBranchProtectionRule to unlock id-of-locked-222', `
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
    {
      updateBranchProtectionRule: {
        branchProtectionRule: { id: 'id-of-locked-222', lockBranch: false, pattern: 'locked' }
      }
    }
  );

  stub.addStub('list open pullrequests, page 1', `
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
    {
      repository: {
        pullRequests: {
          nodes: [
            { id: 'pr-11', number: 11, autoMergeRequest: null },
            { id: 'pr-12', number: 12, autoMergeRequest: { commitHeadline: 'Auto-merge PR #12' } }
          ],
          pageInfo: { endCursor: "end-of-page-1", hasNextPage }
        },
      },
    }
  );

  if (hasNextPage) {
    stub.addStub('list open pullrequests, page 2', `
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
      {
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
    );

    stub.addStub('disablePullRequestAutoMerge for pr-21', `
      mutation {
        disablePullRequestAutoMerge(input: { pullRequestId: "pr-21" } )
        {
          pullRequest { id }
        }
      }`,
      {}
    );
  }

  stub.addStub('disablePullRequestAutoMerge for pr-12', `
    mutation {
      disablePullRequestAutoMerge(input: { pullRequestId: "pr-12" } )
      {
        pullRequest { id }
      }
    }`,
    {}
  );

  return stub;
}