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
const OctokitAction_1 = require("../lib/OctokitAction");
class LockBranch extends OctokitAction_1.OctokitAction {
    execute() {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j;
        return __awaiter(this, void 0, void 0, function* () {
            const lock_branch = this.getInputBoolean("lock");
            const branch = this.getInput("branch-name");
            const { data: old } = yield this.rest.repos.getBranchProtection(this.addRepo({ branch }));
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
                strict: (_a = old.required_status_checks.strict) !== null && _a !== void 0 ? _a : false,
                contexts: old.required_status_checks.contexts,
                checks: old.required_status_checks.checks,
            };
            const required_pull_request_reviews = {};
            function eat(rq) {
            }
            eat({
                required_status_checks: {
                    strict: (_b = old.required_status_checks.strict) !== null && _b !== void 0 ? _b : false,
                    contexts: old.required_status_checks.contexts,
                    checks: old.required_status_checks.checks
                },
                enforce_admins: (_d = (_c = old.enforce_admins) === null || _c === void 0 ? void 0 : _c.enabled) !== null && _d !== void 0 ? _d : false,
                required_pull_request_reviews: null,
                restrictions: null,
                required_linear_history: (_e = old.required_linear_history) === null || _e === void 0 ? void 0 : _e.enabled,
                allow_force_pushes: (_f = old.allow_force_pushes) === null || _f === void 0 ? void 0 : _f.enabled,
                allow_deletions: (_g = old.allow_deletions) === null || _g === void 0 ? void 0 : _g.enabled,
                block_creations: (_h = old.block_creations) === null || _h === void 0 ? void 0 : _h.enabled,
                required_conversation_resolution: (_j = old.required_conversation_resolution) === null || _j === void 0 ? void 0 : _j.enabled,
            });
        });
    }
}
const action = new LockBranch();
action.run();
//# sourceMappingURL=LockBranch.js.map