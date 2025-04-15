import { OctokitAction } from '../lib/OctokitAction';
import { PullRequest } from '../lib/OctokitTypes';
import { JIRA_DOMAIN, JIRA_ISSUE_PATTERN } from '../lib/Constants';
import { NewIssueData } from '../lib/NewIssueData';

class PullRequestCreated extends OctokitAction {
  protected async execute(): Promise<void> {
    if (/DO NOT MERGE/i.test(this.payload.pull_request.title)) {
      this.log("'DO NOT MERGE' found in the PR title, skipping the action.");
      return;
    }
    const pr = await this.getPullRequest(this.payload.pull_request.number);
    if (pr == null) {
      return;
    }
    let linkedIssues = pr.title.match(JIRA_ISSUE_PATTERN);
    if (linkedIssues == null) {
      linkedIssues = [await this.processNewJiraIssue(pr)];
    } else if (pr.title !== this.cleanupWhitespace(pr.title)) { // New issues do this when persisting issue ID
      await this.updatePullRequestTitle(pr.number, this.cleanupWhitespace(pr.title));
    }
    await this.addLinkedIssuesToDescription(pr, linkedIssues);
  }

  private async processNewJiraIssue(pr: PullRequest): Promise<string> {
    const data = await NewIssueData.create(this.jira, pr, this.getInput('jira-project'), this.getInput('additional-fields'), await this.findEmail(this.payload.sender.login));
    if (data) {
      const issueId = await this.jira.createIssue(data.projectKey, pr.title, data.additionalFields);
      if (issueId == null) {
        this.setFailed('Failed to create a new issue in Jira');
        return null;
      } else {
        await this.persistIssueId(pr, issueId);
        await this.jira.moveIssue(issueId, 'Commit');   // OPEN  -> TO DO
        if (data.accountId != null) {
          await this.jira.moveIssue(issueId, 'Start');  // TO DO -> IN PROGRESS only for real accounts, no bots GHA-8
          await this.jira.assignIssueToAccount(issueId, data.accountId);  // Even if there's already a reviewer, we need this first to populate the lastAssignee field in Jira.
        }
        if (this.payload.pull_request.requested_reviewers.length > 0) { // When PR is created directly with a reviewer, process it here. RequestReview action can be scheduled faster and PR title might not have an issue ID yet
          await this.processRequestReview(issueId, this.payload.pull_request.requested_reviewers[0]);
        }
        return issueId;
      }
    } else {
      return null;
    }
  }

  private async persistIssueId(pr: PullRequest, issueId: string): Promise<void> {
    pr.title = this.cleanupWhitespace(`${issueId} ${pr.title}`);
    await this.updatePullRequestTitle(pr.number, pr.title);
  }

  private cleanupWhitespace(value: string): string {
    return value.replace(/\s\s+/g, " ").trim();  // Mainly remove triple space between issue ID and title when copying from Jira
  }

  private async addLinkedIssuesToDescription(pr: PullRequest, linkedIssues: string[]): Promise<void> {
    console.log(`Adding the following ticket in description: ${linkedIssues}`);
    await this.updatePullRequestDescription(pr.number, `${linkedIssues.map(x => this.issueLink(x)).join('\n')}\n\n${pr.body || ''}`);
  }

  private issueLink(issue: string): string {
    return `[${issue}](${JIRA_DOMAIN}/browse/${issue})`;
  }
}

const action = new PullRequestCreated();
action.run();
