import { OctokitAction } from '../lib/OctokitAction';
import { PullRequest } from '../lib/OctokitTypes';
import { JIRA_ISSUE_PATTERN } from '../lib/Constants';
import { NewIssueData } from '../lib/NewIssueData';

class PullRequestCreatedForEngExp extends OctokitAction {
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
      const issueId = await this.processNewJiraIssue(pr);
      await this.updatePullRequestTitle(pr.number, `${issueId} ${pr.title}`);
      linkedIssues = [issueId];
    }
    for (const issue of linkedIssues) {
      await this.updateJiraComponent(issue);
    }
  }

  private async processNewJiraIssue(pr: PullRequest): Promise<string> {
    const data = await NewIssueData.createForEngExp(this.jira, pr, await this.findEmail(this.payload.sender.login));
    const issueId = await this.jira.createIssue(data.projectKey, pr.title, data.additionalFields);
    if (issueId == null) {
      this.setFailed('Failed to create a new issue in Jira');
    } else {
      await this.jira.moveIssue(issueId, 'Commit');             // OPEN  -> TO DO
      if (data.accountId != null) {
        await this.jira.moveIssue(issueId, 'Start Progress');   // TO DO -> IN PROGRESS only for real accounts, no bots GHA-8
        await this.jira.assignIssueToAccount(issueId, data.accountId);
      }
      if (this.payload.pull_request.requested_reviewers.length > 0) { // When PR is created directly with a reviewer, process it here. RequestReview action can be scheduled faster and PR title might not have an issue ID yet
        await this.processRequestReview(issueId, this.payload.pull_request.requested_reviewers[0]);
      }
    }
    return issueId;
  }

  private async updateJiraComponent(issueId: string): Promise<void> {
    const component = this.repo.repo;
    if (!await this.jira.createComponent(issueId.split('-')[0], component)) {   // Same PR can have multiple issues from different projects
      this.setFailed('Failed to create component');
    }
    if (!await this.jira.addIssueComponent(issueId, component)) {
      this.setFailed('Failed to add component');
    }
  }
}

const action = new PullRequestCreatedForEngExp();
action.run();
