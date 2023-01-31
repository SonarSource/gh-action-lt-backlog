"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const GraphQLAction_1 = require("../lib/GraphQLAction");
class LockBranch extends GraphQLAction_1.GraphQLAction {
    execute() {
        return __awaiter(this, void 0, void 0, function* () {
            const pattern = this.getInput("branch-pattern");
            let rule = yield this.FindRule(pattern);
            const lockBranch = !rule.lockBranch;
            rule = yield this.UpdateRule(rule.id, lockBranch);
            if (rule.lockBranch == lockBranch) {
                this.log(`Done: '${pattern}' was ${lockBranch ? "locked" : "unlocked and open for changes"}.`);
            }
            else {
                this.log(`Failed: '${pattern}' was not updated sucessfuly.`); // And we have no idea why
            }
        });
    }
    FindRule(pattern) {
        return __awaiter(this, void 0, void 0, function* () {
            const rules = (yield this.LoadRules()).filter(x => x.pattern == pattern);
            if (rules.length === 0) {
                this.log(`Branch protection rule with pattern '${pattern}' does not exist.`);
                return null;
            }
            else {
                return rules[0];
            }
        });
    }
    LoadRules() {
        return __awaiter(this, void 0, void 0, function* () {
            const { repository: { branchProtectionRules: { nodes } } } = yield this.sendGraphQL(`
            query {
                repository(name: "GitHubActionPlayground", owner: "pavel-mikula-sonarsource") {
                    branchProtectionRules(first: 100) {
                        totalCount
                        nodes {
                            id
                            lockBranch
                            pattern
                        }
                    }
                }
            }`);
            return nodes;
        });
    }
    UpdateRule(id, lockBranch) {
        return __awaiter(this, void 0, void 0, function* () {
            const { updateBranchProtectionRule: { branchProtectionRule } } = yield this.sendGraphQL(`
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
        });
    }
}
const action = new LockBranch();
action.run();
// FIXME: Docs
/*
 * $env:GITHUB_REPOSITORY="pavel-mikula-sonarsource/GitHubActionPlayground"
 * ${env:INPUT_GITHUB-TOKEN}="ghp_...."
 * ${env:INPUT_LOCK}="True"
 * ${env:INPUT_BRANCH-PATTERN}="master"
 * clear; node .\LockBranch\LockBranch.js
 */ 
//# sourceMappingURL=ToggleLockBranch.js.map