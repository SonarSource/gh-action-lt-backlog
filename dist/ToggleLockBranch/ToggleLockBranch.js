"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const GraphQLAction_1 = require("../lib/GraphQLAction");
class LockBranch extends GraphQLAction_1.GraphQLAction {
    async execute() {
        const pattern = this.getInput('branch-pattern');
        let rule = await this.FindRule(pattern);
        if (rule) {
            const lockBranch = !rule.lockBranch;
            rule = await this.UpdateRule(rule.id, lockBranch);
            if (rule.lockBranch === lockBranch) {
                this.log(`Done: '${pattern}' was ${lockBranch ? 'locked' : 'unlocked and open for changes'}.`);
            }
            else {
                this.log(`Failed: '${pattern}' was not updated sucessfuly.`); // And we have no idea why
            }
        }
    }
    async FindRule(pattern) {
        const rules = (await this.LoadRules()).filter(x => x.pattern === pattern);
        if (rules.length === 0) {
            this.log(`Branch protection rule with pattern '${pattern}' does not exist.`);
            return null;
        }
        else {
            return rules[0];
        }
    }
    async LoadRules() {
        const { repository: { branchProtectionRules: { nodes }, }, } = await this.sendGraphQL(`
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
    async UpdateRule(id, lockBranch) {
        const { updateBranchProtectionRule: { branchProtectionRule }, } = await this.sendGraphQL(`
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
//# sourceMappingURL=ToggleLockBranch.js.map