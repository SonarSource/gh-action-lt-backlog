import { OctokitAction } from "./OctokitAction";
import { ProjectContent } from "./ProjectContent";
import { components } from "@octokit/openapi-types/types.d";

export abstract class PullRequestAction extends OctokitAction {

    protected abstract processReassignment(issue: components["schemas"]["issue"]): Promise<void>;

    protected async execute(): Promise<void> {
        const column_id = this.getInputNumber("column-id");
        const project = ProjectContent.FromColumn(this, column_id);

        let processPR = true;
        const pr = this.payload.pull_request;
        const fixedIssues = this.fixedIssues(pr);
        if (fixedIssues) {
            for (const fixedIssue of fixedIssues) {
                let linkedIssue = await this.getIssue(fixedIssue);
                if (linkedIssue) {
                    processPR = false;
                    this.processIssue(project, column_id, linkedIssue);
                }
            }
        }
        if (processPR) {
            const issue = await this.getIssue(pr.number);
            if (issue) {
                this.processIssue(project, column_id, issue);
            }
        }
    }

    protected async processIssue(projectPromise: Promise<ProjectContent>, column_id: number, issue: components["schemas"]["issue"]): Promise<void> {
        await this.processReassignment(issue);
        if (issue.state === "open") {
            const project = await projectPromise;
            const card = await project.findCard(issue.url);
            if (card) {
                await project.moveCard(card, column_id);
            } else {
                await this.createCard(issue, column_id);
            }
        }
    }
}
