"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProjectContent = void 0;
class ProjectContent {
    constructor(action, columns) {
        this.action = action;
        this.columns = columns;
    }
    static async FromColumn(action, column_id) {
        const { data: column } = await action.rest.projects.getColumn({ column_id });
        const project_id = parseInt(column.project_url.split('/').pop());
        return ProjectContent.FromProject(action, project_id);
    }
    static async FromProject(action, project_id) {
        const { data: columns } = await action.rest.projects.listColumns({ project_id });
        return new ProjectContent(action, columns);
    }
    async findCard(issueOrPR) {
        // We should start caching these results in case we need to call it multiple times from a single action
        const content_url = issueOrPR.issue_url ?? issueOrPR.url;
        for (const column of this.columns) {
            const { data: cards } = await this.action.rest.projects.listCards({ column_id: column.id });
            const card = cards.find(x => x.content_url == content_url);
            if (card) {
                return card;
            }
        }
        this.action.log(`Card not found for: ${content_url}`);
        return null;
    }
    async moveOrCreateCard(issueOrPR, column_id) {
        const card = await this.findCard(issueOrPR);
        if (card) {
            await this.moveCard(card, column_id);
        }
        else {
            await this.action.createCard(issueOrPR, column_id);
        }
    }
    async moveCard(card, column_id) {
        console.log(`Moving card to column ${column_id}`);
        await this.action.rest.projects.moveCard({
            card_id: card.id,
            position: 'bottom',
            column_id,
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