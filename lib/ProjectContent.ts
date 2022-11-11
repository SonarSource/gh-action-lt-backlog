import { OctokitAction } from "./OctokitAction";

export class ProjectContent {

    private constructor() {
        
    }

    public static async FromColumn(action: OctokitAction, column_id: number): Promise<ProjectContent> {

        const mediaType = { previews: ['inertia'] }; // Column related APIs are in Alpha Preview. We need to set this HTTP Header to gain access.
        const dataA = (await action.rest.projects.getColumn({ column_id })).data;
        const dataB = (await action.rest.projects.getColumn({ column_id, mediaType })).data;

        action.logSerialized(dataA);
        action.log("----");
        action.logSerialized(dataB);
        
        

        return new ProjectContent();
    }
}