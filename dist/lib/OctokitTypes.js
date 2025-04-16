"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isRenovate = void 0;
function isRenovate(pr) {
    return pr.user.login === "pavel-mikula-sonarsource"; // FIXME: REMOVE DEBUG, do not approve
    return pr.user.login === "renovate[bot]";
}
exports.isRenovate = isRenovate;
//# sourceMappingURL=OctokitTypes.js.map