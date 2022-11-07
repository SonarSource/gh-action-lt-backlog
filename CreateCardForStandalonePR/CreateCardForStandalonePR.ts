import { OctokitAction } from "../lib/OctokitAction";

class CreateCardForStandalonePR extends OctokitAction {
    protected async execute(): Promise<void> {
        const pr:any = this.payload.pull_request;
        const matches = pr.body == null ? null : pr.body.match(/(close|closes|closed|fix|fixes|fixed|resolve|resolves|resolved)\s*#\d+/gi);
        if (matches) {
            this.log("Skip, contains '" + matches[0] + "'");
        } else {
            this.addAssignee(pr, this.payload.sender.login);
            this.createCardPullRequest(pr, this.getInputNumber("column-id"));
        }
    }
}

const action = new CreateCardForStandalonePR();
action.run();
