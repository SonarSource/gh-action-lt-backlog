import { OctokitAction } from '../lib/OctokitAction';
import { PullRequest } from '../lib/OctokitTypes';
import { JIRA_DOMAIN, JIRA_ISSUE_PATTERN } from '../lib/Constants';

interface IssueParameters {
  issuetype: { name: string };
  parent?: { key: string };
}

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
    const linkedIssues = JIRA_ISSUE_PATTERN.exec(pr.title);
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
    const projectKey = this.getInput('jira-project');
    const additionalFields = this.parseAdditionalFields();
    const parameters = await this.newIssueParameters(projectKey, pr, additionalFields.issuetype?.name ?? 'Task'); // Transfer issuetype name manually, because parameters should have priority due to Sub-task.
    const issueId = await this.jira.createIssue(projectKey, pr.title, { ...additionalFields, ...parameters });
    if (issueId == null) {
      this.setFailed('Failed to create a new issue in Jira');
    } else {
      newTitle = `${issueId} ${newTitle}`;
      await this.addLinkedIssuesToDescription(pr, [issueId]);
      await this.jira.moveIssue(issueId, 'Commit');  // OPEN  -> TO DO
      await this.jira.moveIssue(issueId, 'Start');   // TO DO -> IN PROGRESS
      const userEmail = await this.findEmail(this.payload.sender.login);
      if (userEmail) {
        await this.jira.assignIssue(issueId, userEmail);             // Even if there's already a reviewer, we need this first to populate the lastAssignee field in Jira.
      }
      if (this.payload.pull_request.requested_reviewers.length > 0) { // When PR is created directly with a reviewer, process it here. RequestReview action can be scheduled faster and PR title might not have an issue ID yet
        await this.processRequestReview(issueId, this.payload.pull_request.requested_reviewers[0]);
      }
    }
    return newTitle;
  }

  private parseAdditionalFields(): any {
    const inputAdditionFields = this.getInput('additional-fields');
    if (inputAdditionFields) {
      try {
        return JSON.parse(inputAdditionFields);
      } catch (error) {
        console.log(`Unable to parse additional-fields: ${inputAdditionFields}`, error);
      }
    }
    return {};
  }

  private async newIssueParameters(projectKey: string, pr: PullRequest, issueType: string): Promise<IssueParameters> {
    const mentionedIssues = this.findMentionedIssues(pr);
    console.log('Looking for a non-Sub-task ticket');
    const parent = await this.firstNonSubTask(mentionedIssues);
    console.log(parent ? `Parent issue: ${parent?.key} (${parent?.fields.issuetype.name})` : 'No parent issue found');
    switch (parent?.fields.issuetype.name) {
      case 'Epic':
        return { issuetype: { name: issueType }, parent: { key: parent.key } };
      case 'Sub-task':
      case undefined:
      case null:
        return { issuetype: { name: issueType } };
      default:
        return parent.fields.project.key === projectKey   // Sub-task must be created in the same project
          ? { issuetype: { name: 'Sub-task' }, parent: { key: parent.key } }
          : { issuetype: { name: issueType } };
    }
  }

  private async addLinkedIssuesToDescription(pr: PullRequest, linkedIssues: string[]): Promise<void> {
    console.log(`Adding the following ticket in description: ${linkedIssues}`);
    await this.updatePullRequestDescription(pr.number, `${linkedIssues.map(x => this.issueLink(x)).join('\n')}\n\n${pr.body || ''}`);
  }

  private async firstNonSubTask(issues: Set<string>): Promise<any> {
    for (const issueKey of issues) {
      const issue = await this.jira.getIssue(issueKey);
      if (issue?.fields.issuetype.name !== 'Sub-task') {
        return issue;
      }
    }
    return null;
  }

  private findMentionedIssues(pr: PullRequest): Set<string> {
    const mentionedIssues = JIRA_ISSUE_PATTERN.exec(pr.body) || [];
    console.log(mentionedIssues.length > 0 ? `Found mentioned issues: ${mentionedIssues}` : 'No mentioned issues found');
    return new Set(mentionedIssues);
  }

  private issueLink(issue: string): string {
    return `[${issue}](${JIRA_DOMAIN}/browse/${issue})`;
  }
}

const action = new PullRequestCreated();
action.run();
