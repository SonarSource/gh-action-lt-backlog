"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const OctokitAction_1 = require("../lib/OctokitAction");
class LockBranch extends OctokitAction_1.OctokitAction {
    async execute() {
        const pattern = this.inputString('branch-pattern');
        this.log("DEBUG findRule");
        let rule = await this.findRule(pattern);
        if (rule) {
            const lockBranch = !rule.lockBranch;
            if (rule.lockBranch) {
                // FIXME: Wait for PREQ
                // FIXME: Re-run action to see if the update works
                // FIXME: Restore GraphQL query and result to handle matchingRefs again
                //for (const ref of rule.matchingRefs.nodes) {
                await this.cancelAutoMerge(pattern);
                //}
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
    async findRule(pattern) {
        const rules = (await this.loadRules()).filter(x => x.pattern === pattern);
        if (rules.length === 0) {
            this.log(`Branch protection rule with pattern '${pattern}' does not exist.`);
            return null;
        }
        else {
            return rules[0];
        }
    }
    async loadRules() {
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
    async updateRule(id, lockBranch) {
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
    async cancelAutoMerge(branch) {
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
//# sourceMappingURL=ToggleLockBranch.js.map