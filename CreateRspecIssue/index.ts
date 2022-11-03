import { OctokitAction } from "../lib/OctokitAction";

class CreateRspecIssue extends OctokitAction {
    protected async execute() {
        this.log("Creating issue");
        await this.octokit.rest.issues.create(this.addRepo({ title: `Update RSPEC before ${this.payload.milestone.title} release`, milestone: this.payload.milestone.number, labels: ["Type: Tooling"] }));
    }
}

const action = new CreateRspecIssue();
action.run();
