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
        var _a, _b, _c, _d, _e;
        return __awaiter(this, void 0, void 0, function* () {
            const lock_branch = this.getInputBoolean("lock");
            const branch = this.getInput("branch-name");
            //const { data: branchProtection } = await this.rest.repos.getBranchProtection(this.addRepo({ branch }));
            var arg = this.addRepo({ branch, lock_branch });
            this.log("--- getAdminBranchProtection ---");
            this.logSerialized((_a = (yield this.rest.repos.getAdminBranchProtection(arg))) === null || _a === void 0 ? void 0 : _a.data);
            this.log("--- getBranchProtection ---");
            this.logSerialized((_b = (yield this.rest.repos.getBranchProtection(arg))) === null || _b === void 0 ? void 0 : _b.data);
            this.log("--- getCommitSignatureProtection ---");
            this.logSerialized((_c = (yield this.rest.repos.getCommitSignatureProtection(arg))) === null || _c === void 0 ? void 0 : _c.data);
            this.log("--- getPullRequestReviewProtection ---");
            this.logSerialized((_d = (yield this.rest.repos.getPullRequestReviewProtection(arg))) === null || _d === void 0 ? void 0 : _d.data);
            this.log("--- getStatusChecksProtection ---");
            this.logSerialized((_e = (yield this.rest.repos.getStatusChecksProtection(arg))) === null || _e === void 0 ? void 0 : _e.data);
        });
    }
}
const action = new LockBranch();
action.run();
//# sourceMappingURL=LockBranch.js.map