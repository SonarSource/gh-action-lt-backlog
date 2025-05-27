"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addPullRequestExtensions = addPullRequestExtensions;
function addPullRequestExtensions(pr) {
    return {
        ...pr,
        isRenovate: function () {
            return this.user.login === "renovate[bot]";
        },
        isDependabot: function () {
            return this.user.login === "dependabot[bot]";
        }
    };
}
//# sourceMappingURL=OctokitTypes.js.map