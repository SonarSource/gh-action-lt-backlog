import { OctokitAction } from "../lib/OctokitAction";

class LockBranch extends OctokitAction {

    protected async execute(): Promise<void> {
        const lock_branch = this.getInputBoolean("lock");
        const branch = this.getInput("branch-name");
        await this.rest.repos.updateBranchProtection(this.addRepo({ branch, lock_branch }));
    }
}

const action = new LockBranch();
action.run();
