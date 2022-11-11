import { OctokitAction } from "./OctokitAction";
import { components } from "@octokit/openapi-types/types.d";

export class ProjectContent {

    private readonly action: OctokitAction;
    private readonly columns: number[] = [];

    private constructor(action: OctokitAction, columns: number[]) {
        this.action = action;
        this.columns = columns;
    }

    public static async FromColumn(action: OctokitAction, column_id: number): Promise<ProjectContent> {
        const { data: column } = await action.rest.projects.getColumn({ column_id });
        const project_id = parseInt(column.project_url.split("/").pop());
        const { data: columns } = await action.rest.projects.listColumns({ project_id }); 
        return new ProjectContent(action, columns.map(x => x.id));
    }

    public async findCard(content_url: string): Promise<any> {
        // We should start caching these results in case we need to call it multiple times from a single action
        for (const column_id of this.columns) {
            const cards = await this.action.rest.projects.listCards({ column_id });

            // FIXME: REMOVE DEBUG
            this.action.logSerialized(cards);

            const card = cards.data.find(x => x.content_url == content_url);
            if (card) {
                return card;
            }
        }
        this.action.log(`Card not found for: ${content_url}`);
        return null;
    }

    public async moveCard(card: components["schemas"]["project-card"], column_id: number): Promise<void> {
        console.log(`Moving card to column ${column_id}`);
        await this.action.rest.projects.moveCard({
            card_id: card.id,
            position: "bottom",
            column_id
        });
    }
}
