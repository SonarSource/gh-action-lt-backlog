import type { GraphQlQueryResponseData } from '@octokit/graphql';
import { OctokitAction } from '../lib/OctokitAction';

type ProtectionRule = {
  id: string;
  lockBranch: boolean;
  pattern: string;
  matchingRefs: {
    nodes:
    {
      id: string,
      name: string,   // "master"
      prefix: string  // "refs/heads/"
    }[];
  }
};

class LockBranch extends OctokitAction {
  protected async execute(): Promise<void> {
    const pattern = this.getInput('branch-pattern');
    let rule = await this.findRule(pattern);
    if (rule) {
      const lockBranch = !rule.lockBranch;
      if (rule.lockBranch) {
        for (const ref of rule.matchingRefs.nodes) {
          await this.cancelAutoMerge(ref.name);
        }
      }
      // FIXME: REMOVE DEBUG
      //rule = await this.updateRule(rule.id, lockBranch);
      //if (rule.lockBranch === lockBranch) {
      //  const message = `${this.repo.repo}: The branch \`${pattern}\` was ${lockBranch ? 'locked :ice_cube:' : 'unlocked and is now open for changes :sunny:'}`
      //  this.log(`Done: ${message}'`);
      //  this.sendSlackMessage(message);
      //} else {
      //  this.log(`Failed: '${pattern}' was not updated successfully.`); // And we have no idea why
      //}
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
                        matchingRefs(first: 100) {
                            nodes{
                                id
                                name
                                prefix
                            }
                        }
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
    const targetPRs = (await this.octokit.rest.pulls.list(this.addRepo({ base: branch, state: 'open' }))).data;
    const autoClosePRs = targetPRs.filter(x => x.auto_merge);
    this.log(`Found ${targetPRs.length} PRs targeting ${branch}, and ${autoClosePRs.length} with auto-merge.`);
    for (const pr of autoClosePRs) {
      await this.cancelPullRequestAutoMerge(pr.number);
      await this.addComment(pr.number, `The target branch was unlocked and Auto-Merge was canceled to prevent unexpected actions.`);
    }
  }
}

const action = new LockBranch();
action.run();
