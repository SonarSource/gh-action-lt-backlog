import { OctokitAction } from "./OctokitAction";
import { ProjectContent } from "./ProjectContent";
import { IssueOrPR } from "./IssueOrPR";

export abstract class PullRequestAction extends OctokitAction {

    protected abstract processReassignment(issueOrPR: IssueOrPR): Promise<void>;

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
                    await this.processIssue(project, column_id, linkedIssue);
                }
            }
        }
        if (processPR) {
            const fullPR = await this.getPullRequest(pr.number);
            if (fullPR) {
                await this.processIssue(project, column_id, fullPR);
            }
        }
    }

    protected async processIssue(projectPromise: Promise<ProjectContent>, column_id: number, issueOrPR: IssueOrPR): Promise<void> {
        await this.processReassignment(issueOrPR);
        if (issueOrPR.state === "open") {
            const project = await projectPromise;
            const card = await project.findCard(issueOrPR.url);
            if (card) {
                await project.moveCard(card, column_id);
            } else {
                await this.createCard(issueOrPR, column_id);
            }
        }
    }
}
