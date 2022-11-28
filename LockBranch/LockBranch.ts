import { OctokitAction } from "../lib/OctokitAction";

class LockBranch extends OctokitAction {

    protected async execute(): Promise<void> {
        const lock_branch = this.getInputBoolean("lock");
        const branch = this.getInput("branch-name");
        //const { data: branchProtection } = await this.rest.repos.getBranchProtection(this.addRepo({ branch }));
        var arg = this.addRepo({ branch, lock_branch });
        this.log("--- getAdminBranchProtection ---");
        this.logSerialized((await this.rest.repos.getAdminBranchProtection(arg))?.data);
        this.log("--- getBranchProtection ---");
        this.logSerialized((await this.rest.repos.getBranchProtection(arg))?.data);
        this.log("--- getCommitSignatureProtection ---");
        this.logSerialized((await this.rest.repos.getCommitSignatureProtection(arg))?.data);
        this.log("--- getPullRequestReviewProtection ---");
        this.logSerialized((await this.rest.repos.getPullRequestReviewProtection(arg))?.data);
        this.log("--- getStatusChecksProtection ---");
        this.logSerialized((await this.rest.repos.getStatusChecksProtection(arg))?.data);


        //await this.rest.repos.updateBranchProtection(this.addRepo({ branch, lock_branch }));
        //this.log(`Branch '${branch}' was ${lock_branch ? "locked" : "unlocked and open for changes"}.`);
    }
}

const action = new LockBranch();
action.run();
