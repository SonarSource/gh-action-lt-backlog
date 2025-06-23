import type { GraphQlQueryResponseData } from '@octokit/graphql';
import { OctokitAction } from '../lib/OctokitAction';

type ProtectionRule = {
  id: string;
  lockBranch: boolean;
  pattern: string;
};

class LockBranch extends OctokitAction {
  protected async execute(): Promise<void> {
    const pattern = this.inputString('branch-pattern');
    let rule = await this.FindRule(pattern);
    if (rule) {
      const lockBranch = !rule.lockBranch;
      rule = await this.UpdateRule(rule.id, lockBranch);
      if (rule.lockBranch === lockBranch) {
        const message = `${this.repo.repo}: The branch \`${pattern}\` was ${lockBranch ? 'locked :ice_cube:' : 'unlocked and is now open for changes :sunny:'}`
        this.log(`Done: ${message}'`);
        this.sendSlackMessage(message);
      } else {
        this.log(`Failed: '${pattern}' was not updated sucessfuly.`); // And we have no idea why
      }
    }
  }

  private async FindRule(pattern: string): Promise<ProtectionRule> {
    const rules = (await this.LoadRules()).filter(x => x.pattern === pattern);
    if (rules.length === 0) {
      this.log(`Branch protection rule with pattern '${pattern}' does not exist.`);
      return null;
    } else {
      return rules[0];
    }
  }

  private async LoadRules(): Promise<ProtectionRule[]> {
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

  private async UpdateRule(id: string, lockBranch: boolean): Promise<ProtectionRule> {
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
}

const action = new LockBranch();
action.run();
