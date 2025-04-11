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
    let newTitle = pr.title.replace(/\s\s+/g, " ").trim();  // Mainly remove triple space between issue ID and title when copying from Jira
    const linkedIssues = pr.title.match(JIRA_ISSUE_PATTERN);
    if (linkedIssues == null) {
      newTitle = await this.processNewJiraIssue(pr, newTitle);
    } else {
      await this.addLinkedIssuesToDescription(pr, linkedIssues);
    }
    if (pr.title !== newTitle) {
      await this.updatePullRequestTitle(pr.number, newTitle);
    }
  }

  private async processNewJiraIssue(pr: PullRequest, newTitle: string): Promise<string> {
    const data = await NewIssueData.create(this.jira, pr, this.getInput('jira-project'), this.getInput('additional-fields'), await this.findEmail(this.payload.sender.login));
    if (data) {
      const issueId = await this.jira.createIssue(data.projectKey, pr.title, data.additionalFields);;
      if (issueId == null) {
        this.setFailed('Failed to create a new issue in Jira');
      }
      else {
        newTitle = `${issueId} ${newTitle}`;
        await this.addLinkedIssuesToDescription(pr, [issueId]);
        await this.jira.moveIssue(issueId, 'Commit');  // OPEN  -> TO DO
        await this.jira.moveIssue(issueId, 'Start');   // TO DO -> IN PROGRESS
        if (data.accountId != null) {
          await this.jira.assignIssueToAccount(issueId, data.accountId);             // Even if there's already a reviewer, we need this first to populate the lastAssignee field in Jira.
        }
        if (this.payload.pull_request.requested_reviewers.length > 0) { // When PR is created directly with a reviewer, process it here. RequestReview action can be scheduled faster and PR title might not have an issue ID yet
          await this.processRequestReview(issueId, this.payload.pull_request.requested_reviewers[0]);
        }
      }
    }
    return newTitle;
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
