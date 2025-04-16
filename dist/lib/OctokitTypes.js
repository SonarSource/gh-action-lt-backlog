"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addPullRequestExtensions = void 0;
function addPullRequestExtensions(pr) {
    return {
        ...pr,
        ...{
            isRenovate: function () {
                return pr.user.login === "pavel-mikula-sonarsource"; // FIXME: REMOVE DEBUG, do not approve
                return this.user.login === "renovate[bot]";
            }
        }
    };
}
exports.addPullRequestExtensions = addPullRequestExtensions;
//# sourceMappingURL=OctokitTypes.js.map