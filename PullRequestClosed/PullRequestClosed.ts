import { PullRequestAction } from '../lib/PullRequestAction';

export class PullRequestClosed extends PullRequestAction {
  protected async processJiraIssue(issueId: string): Promise<void> {
    if (this.isEngXpSquad) { // Can't auto-close auto-created issues, the reporter is set to the actual user
      const pr = await this.loadPullRequest(this.payload.pull_request.number);
      if (pr.user.type === "Bot") {
        await this.jira.moveIssue(issueId, 'Resolve issue', { resolution: { id: this.resolutionId() } });
      } else {
        this.log(`Skipping issue resolution for non-Bot PR`);
      }
    } else if (this.payload.pull_request.merged) {
      await this.processMerge(issueId);
    }
    else {
      await this.processClose(issueId);
    }
  }

  private async processMerge(issueId: string): Promise<void> {
    const transition = await this.jira.findTransition(issueId, this.isReleaseBranch(this.payload.pull_request.base.ref) ? 'Merge into master' : 'Merge into branch');
    if (transition == null) {
      await this.jira.moveIssue(issueId, 'Merge');
    } else {
      await this.jira.transitionIssue(issueId, transition);
    }
  }

  private async processClose(issueId: string): Promise<void> {
    const issue = await this.jira.loadIssue(issueId);
    const creator = issue?.fields.creator.displayName || null;
    if (creator === "Jira Tech User GitHub") {
      await this.jira.moveIssue(issueId, 'Cancel Issue', { resolution: { id: this.resolutionId() } });
    } else {
      this.log(`Skipping issue cancellation for creator ${creator}`);
    }
  }

  private isReleaseBranch(ref: string): boolean {
    return ref === 'master' || ref === 'main' || ref.startsWith('branch-');
  }

  private resolutionId(): string {
    return this.payload.pull_request.merged
      ? '10000'   // "Done"
      : '10001';  // "Won't do"
  }
}
