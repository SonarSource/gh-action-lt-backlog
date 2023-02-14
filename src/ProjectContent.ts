import { OctokitAction } from "./OctokitAction";
import { IssueOrPR } from "./IssueOrPR";
import { ProjectCard, ProjectColumn } from "./OctokitTypes";

export class ProjectContent {

    private readonly action: OctokitAction;
    private readonly columns: ProjectColumn[];

    private constructor(action: OctokitAction, columns: ProjectColumn[]) {
        this.action = action;
        this.columns = columns;
    }

    public static async FromColumn(action: OctokitAction, column_id: number): Promise<ProjectContent> {
        const { data: column } = await action.rest.projects.getColumn({ column_id });
        const project_id = parseInt(column.project_url.split("/").pop());
        return ProjectContent.FromProject(action, project_id);
    }

    public static async FromProject(action: OctokitAction, project_id: number): Promise<ProjectContent> {
        const { data: columns } = await action.rest.projects.listColumns({ project_id }); 
        return new ProjectContent(action, columns);
    }

    public async findCard(issueOrPR: IssueOrPR): Promise<any> {
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

    public async moveOrCreateCard(issueOrPR: IssueOrPR, column_id: number): Promise<void> {
        const card = await this.findCard(issueOrPR);
        if (card) {
            await this.moveCard(card, column_id);
        } else {
            await this.action.createCard(issueOrPR, column_id);
        }
    }

    public async moveCard(card: ProjectCard, column_id: number): Promise<void> {
        console.log(`Moving card to column ${column_id}`);
        await this.action.rest.projects.moveCard({
            card_id: card.id,
            position: "bottom",
            column_id
        });
    }

    public columnFromName(columnName: string): ProjectColumn {
        const columns = this.columns.filter(x => x.name === columnName);
        if (columns.length === 0) {
            this.action.log("Column doesn't exist: " + columnName);
            return null;
        } else {
            return columns[0];
        }
    }
}
