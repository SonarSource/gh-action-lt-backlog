import type { GraphQlQueryResponseData } from '@octokit/graphql';
import { OctokitAction } from '../lib/OctokitAction';

type ProtectionRule = {
  id: string;
  lockBranch: boolean;
  pattern: string;
};

type PullRequest = {
  id: string;
  number: number;
  autoMergeRequest: { commitHeadLine: string };
};

export class ToggleLockBranch extends OctokitAction {
  protected async execute(): Promise<void> {
    const pattern = this.inputString('branch-pattern');
    let rule = await this.findRule(pattern);
    if (rule) {
      const lockBranch = !rule.lockBranch;
      if (rule.lockBranch) {  // Was locked => unlocking
          await this.cancelAutoMerge(pattern);
      }
      rule = await this.updateRule(rule.id, lockBranch);
      if (rule.lockBranch === lockBranch) {
        const message = `${this.repo.repo}: The branch \`${pattern}\` was ${lockBranch ? 'locked :ice_cube:' : 'unlocked and is now open for changes :sunny:'}`
        this.log(`Done: ${message}'`);
        this.sendSlackMessage(message);
      } else {
        this.log(`Failed: '${pattern}' was not updated successfully.`); // And we have no idea why
      }
    }
  }

  private async findRule(pattern: string): Promise<ProtectionRule> {
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
              nodes{
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
      this.log(`${hasNextPage}, ${endCursor}`);
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
