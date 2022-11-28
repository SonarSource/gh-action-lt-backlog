import { OctokitAction } from "../lib/OctokitAction";

class LockBranch extends OctokitAction {

    protected async execute(): Promise<void> {
        const lock_branch = this.getInputBoolean("lock");
        const branch = this.getInput("branch-name");
        const { data: old } = await this.rest.repos.getBranchProtection(this.addRepo({ branch }));

        this.log("--- DEBUG ---");
        this.logSerialized(old);
        this.log("---");

        //var arg = this.addRepo({ branch, lock_branch });
        //this.log("--- getAdminBranchProtection ---");
        //this.logSerialized((await this.rest.repos.getAdminBranchProtection(arg))?.data);
        //this.log("--- getBranchProtection ---");
        //this.logSerialized((await this.rest.repos.getBranchProtection(arg))?.data);
        //this.log("--- getCommitSignatureProtection ---");
        //this.logSerialized((await this.rest.repos.getCommitSignatureProtection(arg))?.data);
        //this.log("--- getPullRequestReviewProtection ---");
        //this.logSerialized((await this.rest.repos.getPullRequestReviewProtection(arg))?.data);
        ////this.log("--- getStatusChecksProtection ---");
        ////this.logSerialized((await this.rest.repos.getStatusChecksProtection(arg))?.data);
        const required_status_checks = {
            strict: old.required_status_checks.strict ?? false,
            contexts: old.required_status_checks.contexts,
            checks: old.required_status_checks.checks,
        };
        const required_pull_request_reviews = {

        };

        // FIXME:Debug request
        type RQ = {
                    /** @description Require status checks to pass before merging. Set to `null` to disable. */
                    required_status_checks: {
                        /** @description Require branches to be up to date before merging. */
                        strict: boolean;
                        /**
                         * @deprecated
                         * @description **Deprecated**: The list of status checks to require in order to merge into this branch. If any of these checks have recently been set by a particular GitHub App, they will be required to come from that app in future for the branch to merge. Use `checks` instead of `contexts` for more fine-grained control.
                         */
                        contexts: string[];
                        /** @description The list of status checks to require in order to merge into this branch. */
                        checks ?: {
                            /** @description The name of the required check */
                            context: string;
                            /** @description The ID of the GitHub App that must provide this check. Omit this field to automatically select the GitHub App that has recently provided this check, or any app if it was not set by a GitHub App. Pass -1 to explicitly allow any app to set the status. */
                            app_id?: number;
                        }[];
                    } | null;
                    /** @description Enforce all configured restrictions for administrators. Set to `true` to enforce required status checks for repository administrators. Set to `null` to disable. */
                    enforce_admins: boolean | null;
                    /** @description Require at least one approving review on a pull request, before merging. Set to `null` to disable. */
                    required_pull_request_reviews: {
                        /** @description Specify which users, teams, and apps can dismiss pull request reviews. Pass an empty `dismissal_restrictions` object to disable. User and team `dismissal_restrictions` are only available for organization-owned repositories. Omit this parameter for personal repositories. */
                        dismissal_restrictions ?: {
                            /** @description The list of user `login`s with dismissal access */
                            users?: string[];
                            /** @description The list of team `slug`s with dismissal access */
                            teams?: string[];
                            /** @description The list of app `slug`s with dismissal access */
                            apps?: string[];
                        };
                        /** @description Set to `true` if you want to automatically dismiss approving reviews when someone pushes a new commit. */
                        dismiss_stale_reviews ?: boolean;
                        /** @description Blocks merging pull requests until [code owners](https://docs.github.com/articles/about-code-owners/) review them. */
                        require_code_owner_reviews ?: boolean;
                        /** @description Specify the number of reviewers required to approve pull requests. Use a number between 1 and 6 or 0 to not require reviewers. */
                        required_approving_review_count ?: number;
                        /** @description Allow specific users, teams, or apps to bypass pull request requirements. */
                        bypass_pull_request_allowances ?: {
                            /** @description The list of user `login`s allowed to bypass pull request requirements. */
                            users?: string[];
                            /** @description The list of team `slug`s allowed to bypass pull request requirements. */
                            teams?: string[];
                            /** @description The list of app `slug`s allowed to bypass pull request requirements. */
                            apps?: string[];
                        };
                    } | null;
                    /** @description Restrict who can push to the protected branch. User, app, and team `restrictions` are only available for organization-owned repositories. Set to `null` to disable. */
                    restrictions: {
                        /** @description The list of user `login`s with push access */
                        users: string[];
                        /** @description The list of team `slug`s with push access */
                        teams: string[];
                        /** @description The list of app `slug`s with push access */
                        apps ?: string[];
                    } | null;
                    /** @description Enforces a linear commit Git history, which prevents anyone from pushing merge commits to a branch. Set to `true` to enforce a linear commit history. Set to `false` to disable a linear commit Git history. Your repository must allow squash merging or rebase merging before you can enable a linear commit history. Default: `false`. For more information, see "[Requiring a linear commit history](https://docs.github.com/github/administering-a-repository/requiring-a-linear-commit-history)" in the GitHub Help documentation. */
                    required_linear_history ?: boolean;
                    /** @description Permits force pushes to the protected branch by anyone with write access to the repository. Set to `true` to allow force pushes. Set to `false` or `null` to block force pushes. Default: `false`. For more information, see "[Enabling force pushes to a protected branch](https://docs.github.com/en/github/administering-a-repository/enabling-force-pushes-to-a-protected-branch)" in the GitHub Help documentation." */
                    allow_force_pushes ?: boolean | null;
                    /** @description Allows deletion of the protected branch by anyone with write access to the repository. Set to `false` to prevent deletion of the protected branch. Default: `false`. For more information, see "[Enabling force pushes to a protected branch](https://docs.github.com/en/github/administering-a-repository/enabling-force-pushes-to-a-protected-branch)" in the GitHub Help documentation. */
                    allow_deletions ?: boolean;
                    /** @description If set to `true`, the `restrictions` branch protection settings which limits who can push will also block pushes which create new branches, unless the push is initiated by a user, team, or app which has the ability to push. Set to `true` to restrict new branch creation. Default: `false`. */
                    block_creations ?: boolean;
                    /** @description Requires all conversations on code to be resolved before a pull request can be merged into a branch that matches this rule. Set to `false` to disable. Default: `false`. */
                    required_conversation_resolution ?: boolean;
                };
        function eat(rq: RQ)    // FIXME: Remove RQ, wrap it tak, aby to validovalo rovnou
        {

        }
        eat({
            required_status_checks: {
                strict: old.required_status_checks.strict ?? false,
                contexts: old.required_status_checks.contexts,
                checks: old.required_status_checks.checks
            },
            enforce_admins: old.enforce_admins?.enabled ?? false,
            required_pull_request_reviews: null,    // FIXME: Doresit
            restrictions: null,                     // FIXME: Doresit
            required_linear_history: old.required_linear_history?.enabled,
            allow_force_pushes: old.allow_force_pushes?.enabled,
            allow_deletions: old.allow_deletions?.enabled,
            block_creations: old.block_creations?.enabled,
            required_conversation_resolution: old.required_conversation_resolution?.enabled,
        });


        //branchProtection.allow_deletions.enabled
        //await this.rest.repos.updateBranchProtection(this.addRepo({
        //    branch,
        //    required_status_checks,
        //    enforce_admins: old.enforce_admins.enabled,
        //    required_pull_request_reviews,
        //    restrictions: old.restrictions,
        //    lock_branch
        //}));
        //this.log(`Branch '${branch}' was ${lock_branch ? "locked" : "unlocked and open for changes"}.`);
    }
}

const action = new LockBranch();
action.run();
