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
    constructor(action, columns) {
        this.action = action;
        this.columns = columns;
    }
    static FromColumn(action, column_id) {
        return __awaiter(this, void 0, void 0, function* () {
            const { data: column } = yield action.rest.projects.getColumn({ column_id });
            const project_id = parseInt(column.project_url.split("/").pop());
            return ProjectContent.FromProject(action, project_id);
        });
    }
    static FromProject(action, project_id) {
        return __awaiter(this, void 0, void 0, function* () {
            const { data: columns } = yield action.rest.projects.listColumns({ project_id });
            return new ProjectContent(action, columns);
        });
    }
    findCard(issueOrPR) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            // We should start caching these results in case we need to call it multiple times from a single action
            const content_url = (_a = issueOrPR.issue_url) !== null && _a !== void 0 ? _a : issueOrPR.url;
            for (const column of this.columns) {
                const { data: cards } = yield this.action.rest.projects.listCards({ column_id: column.id });
                const card = cards.find(x => x.content_url == content_url);
                if (card) {
                    return card;
                }
            }
            this.action.log(`Card not found for: ${content_url}`);
            return null;
        });
    }
    moveOrCreateCard(issueOrPR, column_id) {
        return __awaiter(this, void 0, void 0, function* () {
            const card = yield this.findCard(issueOrPR);
            if (card) {
                yield this.moveCard(card, column_id);
            }
            else {
                yield this.action.createCard(issueOrPR, column_id);
            }
        });
    }
    moveCard(card, column_id) {
        return __awaiter(this, void 0, void 0, function* () {
            console.log(`Moving card to column ${column_id}`);
            yield this.action.rest.projects.moveCard({
                card_id: card.id,
                position: "bottom",
                column_id
            });
        });
    }
    columnFromName(columnName) {
        const columns = this.columns.filter(x => x.name === columnName);
        if (columns.length === 0) {
            this.action.log("Column doesn't exist: " + columnName);
            return null;
        }
        else {
            return columns[0];
        }
    }
}
exports.ProjectContent = ProjectContent;
//# sourceMappingURL=ProjectContent.js.map