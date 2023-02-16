"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Action_1 = require("../lib/Action");
const core = require("@actions/core");
const child_process_1 = require("child_process");
const simple_git_1 = require("simple-git");
class CheckCompiledCommited extends Action_1.Action {
    /**
     * 1. run compile command
     * 2. run git status
     * 3. throw error if there is something.
    */
    async execute() {
        try {
            const buildCommand = core.getInput('build-command');
            if (buildCommand === undefined) {
                throw new Error('Missing "build-command" input.');
            }
            (0, child_process_1.execSync)(buildCommand);
            const status = await (0, simple_git_1.simpleGit)().status();
            if (!isEmpty(status)) {
                throw new Error(`There are uncommited compiled files: ${JSON.stringify(status, null, 2)}`);
            }
        }
        catch (error) {
            core.setFailed(error.message);
        }
    }
}
const action = new CheckCompiledCommited();
action.run();
function isEmpty(gitStatus) {
    return gitStatus.not_added.length === 0 && gitStatus.conflicted.length === 0 && gitStatus.created.length === 0 && gitStatus.deleted.length === 0;
}
//# sourceMappingURL=index.js.map