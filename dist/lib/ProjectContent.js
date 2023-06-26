"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProjectContent = void 0;
class ProjectContent {
    constructor(action, columns) {
        this.action = action;
        this.columns = columns;
    }
    static async fromColumn(action, column_id) {
        const { data: column } = await action.rest.projects.getColumn({ column_id });
        const project_id = parseInt(column.project_url.split('/').pop());
        return ProjectContent.fromProject(action, project_id);
    }
    static async fromProject(action, project_id) {
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
            await this.createCardCore(issueOrPR, column_id);
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
    async createCard(issueOrPR, column_id) {
        const card = await this.findCard(issueOrPR);
        if (card) {
            this.action.log(`Card already exists for #${issueOrPR.number} in ${card.column_url}`);
        }
        else {
            await this.createCardCore(issueOrPR, column_id);
        }
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
    async createCardCore(issueOrPR, column_id) {
        const content_type = issueOrPR.url.indexOf('/pulls/') < 0 ? 'Issue' : 'PullRequest';
        const content_id = issueOrPR.id;
        this.action.log(`Creating ${content_type} card for #${issueOrPR.number}`);
        try {
            await this.action.rest.projects.createCard({ column_id, content_id, content_type });
        }
        catch (ex) { // Issues or PRs can be assigned to a project in "Awaiting triage" state. Those are not discoverable via REST API
            this.action.log(`Failed to create a card: ${ex}`);
        }
    }
}
exports.ProjectContent = ProjectContent;
//# sourceMappingURL=ProjectContent.js.map