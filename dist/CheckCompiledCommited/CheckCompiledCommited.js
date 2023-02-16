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
    execute() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const buildCommand = core.getInput('build-command');
                if (buildCommand === undefined) {
                    throw new Error('Missing "build-command" input.');
                }
                (0, child_process_1.execSync)(buildCommand);
                const status = yield (0, simple_git_1.simpleGit)().status();
                if (!isEmpty(status)) {
                    throw new Error(`There are uncommited compiled files: ${JSON.stringify(status, null, 2)}`);
                }
            }
            catch (error) {
                core.setFailed(error.message);
            }
        });
    }
}
const action = new CheckCompiledCommited();
action.run();
function isEmpty(gitStatus) {
    return gitStatus.not_added.length === 0 && gitStatus.conflicted.length === 0 && gitStatus.created.length === 0 && gitStatus.deleted.length === 0;
}
//# sourceMappingURL=CheckCompiledCommited.js.map