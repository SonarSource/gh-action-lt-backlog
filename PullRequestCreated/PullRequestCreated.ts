import { OctokitAction } from '../lib/OctokitAction';
import { PullRequest } from '../lib/OctokitTypes';
import { JIRA_DOMAIN, RENOVATE_PREFIX } from '../lib/Constants';
import { NewIssueData } from '../lib/NewIssueData';

class PullRequestCreated extends OctokitAction {
  protected async execute(): Promise<void> {
    const inputJiraProject = this.getInput('jira-project');
    const inputAdditionalFields = this.getInput('additional-fields');
    if (this.isEngXpSquad) {
      if (inputJiraProject) {
        this.setFailed('jira-project input is not supported when is-eng-xp-squad is set.');
        return;
      }
      if (inputAdditionalFields) {
        this.setFailed('additional-fields input is not supported when is-eng-xp-squad is set.');
        return;
      }
    }
    if (/DO NOT MERGE/i.test(this.payload.pull_request.title)) {
      this.log("'DO NOT MERGE' found in the PR title, skipping the action.");
      return;
    }
    const pr = await this.getPullRequest(this.payload.pull_request.number);
    if (pr == null) {
      return;
    }
    let fixedIssues = await this.findFixedIssues(pr);
    if (fixedIssues == null) {
      const issueId = await this.processNewJiraIssue(pr, inputJiraProject, inputAdditionalFields);
      if (issueId) {
        fixedIssues = [issueId];
      }
    } else if (pr.title !== this.cleanupWhitespace(pr.title)) { // New issues do this when persisting issue ID
      await this.updatePullRequestTitle(pr.number, this.cleanupWhitespace(pr.title));
    }
    if (this.isEngXpSquad) {
      for (const issue of fixedIssues) {
        await this.updateJiraComponent(issue);
      }
    } else {
      await this.addLinkedIssuesToDescription(pr, fixedIssues);
    }
  }

  private async processNewJiraIssue(pr: PullRequest, inputJiraProject: string, inputAdditionalFields: string): Promise<string> {
    const data = this.isEngXpSquad
      ? await NewIssueData.createForEngExp(this.jira, pr, await this.findEmail(this.payload.sender.login))
      : await NewIssueData.create(this.jira, pr, inputJiraProject, inputAdditionalFields, await this.findEmail(this.payload.sender.login));
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
    if (pr.isRenovate()) {  // Renovate overrides the PR title back to the original https://github.com/renovatebot/renovate/issues/26833
      await this.addComment(pr.number, RENOVATE_PREFIX + this.issueLink(issueId));  // We'll store the ID in comment as a workaround
    } else {
      pr.title = this.cleanupWhitespace(`${issueId} ${pr.title}`);
      await this.updatePullRequestTitle(pr.number, pr.title);
    }
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

const action = new PullRequestCreated();
action.run();
