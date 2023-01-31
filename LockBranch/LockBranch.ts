import { graphql } from "@octokit/graphql";
import { OctokitAction } from "../lib/OctokitAction";
import type { GraphQlQueryResponseData } from "@octokit/graphql";

type ProtectionRule = {
    id: string;
    lockBranch: boolean;
    pattern: string;
}

class LockBranch extends OctokitAction {

    protected async execute(): Promise<void> {
        //const lock_branch = this.getInputBoolean("lock");
        const pattern = this.getInput("branch-pattern");

        this.log("Pattern: " + pattern);
        //this.log("Lock: " + lock_branch);
        this.logSerialized(this.repo);
        this.log("--- GraphQL ---");

        const graphqlWithAuth = graphql.defaults({
            headers: {
                authorization: `token ${this.getInput("github-token")}`,
            },
        });
        const rules = await this.LoadRules(graphqlWithAuth);
        this.logSerialized(rules);
        this.log("---");
        const rules2 = rules.filter(x => x.pattern == pattern);
        if (rules2.length === 0) {
            this.log(`Branch protection rule with pattern '${pattern}' does not exist.`)
        } else {
            const rule = rules2[0];
            const lockBranch = !rule.lockBranch;
            //if (rule.lockBranch === lock_branch) {
            //    this.log(`Skip: '${pattern}' was already ${lock_branch ? "locked" : "unlocked and open for changes"}.`);
            //} else {
                const { updateBranchProtectionRule: { branchProtectionRule } }: GraphQlQueryResponseData = await graphqlWithAuth(`
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
                const rule2: ProtectionRule = branchProtectionRule;
            if (rule2.lockBranch == lockBranch) {
                this.log(`Done: '${pattern}' was ${lockBranch ? "locked" : "unlocked and open for changes"}.`);
                } else {
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
    }

    private async LoadRules(graphqlWithAuth: any /*FIXME*/): Promise<ProtectionRule[]> {
        const { repository: { branchProtectionRules: { nodes } } }: GraphQlQueryResponseData = await graphqlWithAuth(`
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