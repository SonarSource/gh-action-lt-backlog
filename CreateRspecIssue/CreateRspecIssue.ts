import { OctokitAction } from "../lib/OctokitAction";

class CreateRspecIssue extends OctokitAction {
    protected async execute(): Promise<void> {
        this.log("Creating issue");
        const issue = await this.rest.issues.create(this.addRepo({
            title: `Update RSPEC before ${this.payload.milestone.title} release`,
            milestone: this.payload.milestone.number,
            labels: ["Type: Tooling"]
        }));
        this.log(`Created issue #${issue.data.number}: ${issue.data.html_url}`);
    }
}

const action = new CreateRspecIssue();
action.run();
