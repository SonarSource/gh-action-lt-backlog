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

import type { GraphQlQueryResponseData } from '@octokit/graphql';
import { OctokitAction } from './OctokitAction.js';

export type ProtectionRule = {
  id: string;
  lockBranch: boolean;
  pattern: string;
};

type PullRequest = {
  id: string;
  number: number;
  autoMergeRequest: { commitHeadline: string };
};

export abstract class LockBranchAction extends OctokitAction {
  protected abstract resolveLockBranch(rule: ProtectionRule): boolean;

  protected async execute(): Promise<void> {
    const pattern = this.inputString('branch-pattern');
    const additionalMessage = this.inputString('additional-message');
    const rule = await this.findRule(pattern);
    if (rule) {
      const lockBranch = this.resolveLockBranch(rule);
      if (rule.lockBranch === lockBranch) {
        this.log(`The branch \`${pattern}\` is already ${lockBranch ? 'locked' : 'unlocked'}.`);
      } else {
        if (!lockBranch) {  // Was locked => unlocking
          await this.cancelAutoMerge(pattern);
        }
        const updated = await this.updateRule(rule.id, lockBranch);
        if (updated.lockBranch === lockBranch) {
          const action = lockBranch ? 'locked :ice_cube:' : 'unlocked and is now open for changes :sunny:';
          const suffix = additionalMessage ? `\n\n${additionalMessage}` : '';
          const message = `${this.repo.repo}: The branch \`${pattern}\` was ${action}${suffix}`;
          this.log(`Done: ${message}`);
          this.sendSlackMessage(message);
        } else {
          this.log(`Failed: '${pattern}' was not updated successfully.`); // And we have no idea why
        }
      }
    }
  }

  private async findRule(pattern: string): Promise<ProtectionRule | null> {
    const rules = (await this.loadRules()).filter(x => x.pattern === pattern);
    if (rules.length === 0) {
      this.log(`Branch protection rule with pattern '${pattern}' does not exist.`);
      return null;
    } else {
      return rules[0];
    }
  }

  private async loadRules(): Promise<ProtectionRule[]> {
    const {
      repository: {
        branchProtectionRules: { nodes },
      },
    }: GraphQlQueryResponseData = await this.sendGraphQL(`
      query {
        repository(owner: "${this.repo.owner}", name: "${this.repo.repo}") {
          branchProtectionRules(first: 100) {
            nodes {
              id
              lockBranch
              pattern
            }
          }
        }
      }`);
    return nodes;
  }

  private async updateRule(id: string, lockBranch: boolean): Promise<ProtectionRule> {
    const {
      updateBranchProtectionRule: { branchProtectionRule },
    }: GraphQlQueryResponseData = await this.sendGraphQL(`
      mutation {
        updateBranchProtectionRule(input:{
          branchProtectionRuleId: "${id}",
          lockBranch: ${lockBranch}
        })
        {
          branchProtectionRule {
            id
            lockBranch
            pattern
          }
        }
      }`);
    return branchProtectionRule;
  }

  private async cancelAutoMerge(branch: string): Promise<void> {
    this.log(`Canceling auto-merge for branch '${branch}'`);
    const targetPRs = await this.loadPullRequests(branch);
    const autoClosePRs = targetPRs.filter(x => x.autoMergeRequest);
    this.log(`Found ${targetPRs.length} PRs targeting ${branch}, and ${autoClosePRs.length} with auto-merge.`);
    for (const pr of autoClosePRs) {
      await this.cancelPullRequestAutoMerge(pr);
      await this.addComment(pr.number, `The target branch was unlocked and auto-merge was canceled to prevent unexpected actions.`);
    }
  }

  private async loadPullRequests(targetBranch: string): Promise<PullRequest[]> {
    const allNodes: PullRequest[] = [];
    let after: string = "";
    while (after !== null) {
      const {
        repository: {
          pullRequests: { nodes, pageInfo: { endCursor, hasNextPage } },
        },
      }: GraphQlQueryResponseData = await this.sendGraphQL(`
        query {
          repository(owner: "${this.repo.owner}", name: "${this.repo.repo}") {
            pullRequests(first: 100, after: "${after}", states: OPEN, baseRefName:"${targetBranch}"){
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
        }`);
      allNodes.push(...nodes);
      after = hasNextPage ? endCursor : null;
    }
    return allNodes;
  }

  private async cancelPullRequestAutoMerge(pr: PullRequest): Promise<void> {
    this.log(`Canceling auto-merge for PR #${pr.number}`);
    await this.sendGraphQL(`
      mutation {
        disablePullRequestAutoMerge(input: { pullRequestId: "${pr.id}" } )
        {
          pullRequest { id }
        }
      }`);
  }
}
