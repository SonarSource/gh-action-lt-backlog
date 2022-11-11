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
exports.ProjectContent = void 0;
class ProjectContent {
    constructor() {
    }
    static FromColumn(action, column_id) {
        return __awaiter(this, void 0, void 0, function* () {
            const mediaType = { previews: ['inertia'] }; // Column related APIs are in Alpha Preview. We need to set this HTTP Header to gain access.
            const dataA = (yield action.rest.projects.getColumn({ column_id })).data;
            const dataB = (yield action.rest.projects.getColumn({ column_id, mediaType })).data;
            action.logSerialized(dataA);
            action.log("----");
            action.logSerialized(dataB);
            return new ProjectContent();
        });
    }
}
exports.ProjectContent = ProjectContent;
//# sourceMappingURL=ProjectContent.js.map