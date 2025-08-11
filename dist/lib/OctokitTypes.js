"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addPullRequestExtensions = addPullRequestExtensions;
function addPullRequestExtensions(pr) {
    return {
        ...pr,
        isRenovate() {
            return this.user.login === "renovate[bot]";
        },
        isDependabot() {
            return this.user.login === "dependabot[bot]";
        }
    };
}
//# sourceMappingURL=OctokitTypes.js.map