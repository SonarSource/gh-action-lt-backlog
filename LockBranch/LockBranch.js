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
const graphql_1 = require("@octokit/graphql");
const OctokitAction_1 = require("../lib/OctokitAction");
class LockBranch extends OctokitAction_1.OctokitAction {
    execute() {
        return __awaiter(this, void 0, void 0, function* () {
            //const lock_branch = this.getInputBoolean("lock");
            const pattern = this.getInput("branch-pattern");
            this.log("Pattern: " + pattern);
            //this.log("Lock: " + lock_branch);
            this.logSerialized(this.repo);
            this.log("--- GraphQL ---");
            const graphqlWithAuth = graphql_1.graphql.defaults({
                headers: {
                    authorization: `token ${this.getInput("github-token")}`,
                },
            });
            const rules = yield this.LoadRules(graphqlWithAuth);
            this.logSerialized(rules);
            this.log("---");
            const rules2 = rules.filter(x => x.pattern == pattern);
            if (rules2.length === 0) {
                this.log(`Branch protection rule with pattern '${pattern}' does not exist.`);
            }
            else {
                const rule = rules2[0];
                const lockBranch = !rule.lockBranch;
                //if (rule.lockBranch === lock_branch) {
                //    this.log(`Skip: '${pattern}' was already ${lock_branch ? "locked" : "unlocked and open for changes"}.`);
                //} else {
                const { updateBranchProtectionRule: { branchProtectionRule } } = yield graphqlWithAuth(`
                    mutation {
                        updateBranchProtectionRule(input:{
                            branchProtectionRuleId: "${rule.id}",
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
                const rule2 = branchProtectionRule;
                if (rule2.lockBranch == lockBranch) {
                    this.log(`Done: '${pattern}' was ${lockBranch ? "locked" : "unlocked and open for changes"}.`);
                }
                else {
                    this.log(`Failed: '${pattern}' was not updated sucessfuly.`); // And we have no idea why
                }
                //            }
            }
            this.log("---");
            return;
            // FIXME: If not present, error and stop
            // FIXME: Find minimal token permissions: Only public_repo
            // FIXME: Ask REs if I can do that
            //branchProtection.allow_deletions.enabled
            //await this.rest.repos.updateBranchProtection(this.addRepo(rq));
            //this.log(`Branch '${branch}' was ${lock_branch ? "locked" : "unlocked and open for changes"}.`);
        });
    }
    LoadRules(graphqlWithAuth /*FIXME*/) {
        return __awaiter(this, void 0, void 0, function* () {
            const { repository: { branchProtectionRules: { nodes } } } = yield graphqlWithAuth(`
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
//# sourceMappingURL=LockBranch.js.map