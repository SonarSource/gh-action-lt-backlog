"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addPullRequestExtensions = void 0;
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
exports.addPullRequestExtensions = addPullRequestExtensions;
//# sourceMappingURL=OctokitTypes.js.map