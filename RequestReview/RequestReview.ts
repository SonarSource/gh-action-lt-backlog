import { OctokitAction } from "../lib/OctokitAction";
import { ProjectContent } from "../lib/ProjectContent";
import { components } from "@octokit/openapi-types/types.d";

class RequestReview extends OctokitAction {
    protected async execute(): Promise<void> {
        const column_id = this.getInputNumber("column-id");
        const project = ProjectContent.FromColumn(this, column_id);

        let processPR = true;
        const pr = this.payload.pull_request;
        const matches = this.fixingMatches(pr);
        if (matches) {
            for (const match of matches) {
                this.log("Processing linked issue: " + match);
                let linkedIssue = await this.getIssue(parseInt(match.split("#")[1]));
                if (linkedIssue) {
                    processPR = false;
                    this.processIssue(linkedIssue);
                }
            }
        }
        if (processPR) {
            console.log("Processing PR: #" + pr.number);
            const issue = await this.getIssue(pr.number);
            if (issue) {
                this.processIssue(issue);
            }
        }

        //async function findCard(content_url) {
        //    // Columns are searched from the most probable one
        //    const allColumns = [REVIEW_IN_PROGRESS_COLUMN, REVIEW_APPROVED_COLUMN, IN_PROGRESS_COLUMN, TODO_COLUMN, VALIDATE_PEACH_COLUMN, DONE_COLUMN];
        //    for (let i = 0; i < allColumns.length; i++) {
        //        let cards = await github.projects.listCards({ column_id: allColumns[i] });
        //        let card = cards.data.find(x => x.content_url == content_url);
        //        if (card) {
        //            return card;
        //        }
        //    }
        //    console.log("Card not found for: " + content_url);
        //    return null;
        //}
        ////
        //async function removeAssignees(issue) {
        //    const oldAssignees = issue.assignees.map(x => x.login);
        //    if (oldAssignees.length !== 0) {
        //        console.log("Removing assignees: " + oldAssignees.join(", "));
        //        await github.issues.removeAssignees({
        //            owner: context.repo.owner,
        //            repo: context.repo.repo,
        //            issue_number: issue.number,
        //            assignees: oldAssignees
        //        });
        //    }
        //}
        ////
        //async function addAssignee(issue, login) {
        //    console.log("Assigning to: " + login);
        //    await github.issues.addAssignees({
        //        owner: context.repo.owner,
        //        repo: context.repo.repo,
        //        issue_number: issue.number,
        //        assignees: [login]
        //    });
        //}
    }

    async processIssue(issue: components["schemas"]["issue"]): Promise<void> {
        if (issue.state === "open") {
        //    await this.removeAssignees(issue);
        //    addAssignee(issue, context.payload.requested_reviewer.login);
        //    const card = await findCard(issue.url);
        //    if (card) {
        //        console.log("Moving card");
        //        github.projects.moveCard({ card_id: card.id, position: "bottom", column_id: REVIEW_IN_PROGRESS_COLUMN });
        //    } else if (issue.pull_request) {
        //        console.log("Creating PR card");
        //        github.projects.createCard({ column_id: REVIEW_IN_PROGRESS_COLUMN, content_id: context.payload.pull_request.id, content_type: "PullRequest" });
        //    } else {
        //        console.log("Creating Issue card");
        //        github.projects.createCard({ column_id: REVIEW_IN_PROGRESS_COLUMN, content_id: issue.id, content_type: "Issue" });
        //    }
        }
    }
}

const action = new RequestReview();
action.run();
