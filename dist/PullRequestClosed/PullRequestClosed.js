"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const PullRequestAction_1 = require("../lib/PullRequestAction");
class PullRequestClosed extends PullRequestAction_1.PullRequestAction {
    async processJiraIssue(issueId) {
        if (this.getInputBoolean('is-infra')) { // Can't auto-close auto-created issues, the reporter is set to the actual user
            const pr = await this.getPullRequest(this.payload.pull_request.number);
            if (pr.user.type === "Bot") {
                await this.jira.moveIssue(issueId, 'Resolve issue', { resolution: { id: this.resolutionId() } });
            }
            else {
                this.log(`Skipping issue resolution for non-Bot PR`);
            }
        }
        else if (this.payload.pull_request.merged) {
            await this.processMerge(issueId);
        }
        else {
            await this.processClose(issueId);
        }
    }
    async processMerge(issueId) {
        const transition = await this.jira.findTransition(issueId, this.isReleaseBranch(this.payload.pull_request.base.ref) ? 'Merge into master' : 'Merge into branch');
        if (transition == null) {
            await this.jira.moveIssue(issueId, 'Merge');
        }
        else {
            await this.jira.transitionIssue(issueId, transition);
        }
    }
    async processClose(issueId) {
        const issue = await this.jira.getIssue(issueId);
        const creator = issue?.fields.creator.displayName;
        if (creator === "Jira Tech User GitHub") {
            await this.jira.moveIssue(issueId, 'Cancel Issue', { resolution: { id: this.resolutionId() } });
        }
        else {
            this.log(`Skipping issue cancellation for creator ${creator}`);
        }
    }
    isReleaseBranch(ref) {
        return ref === 'master' || ref === 'main' || ref.startsWith('branch-');
    }
    resolutionId() {
        return this.payload.pull_request.merged
            ? '10000' // "Done"
            : '10001'; // "Won't do"
    }
}
const action = new PullRequestClosed();
action.run();
//# sourceMappingURL=PullRequestClosed.js.map