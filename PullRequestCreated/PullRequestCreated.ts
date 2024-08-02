import { OctokitAction } from '../lib/OctokitAction';
import { PullRequest } from '../lib/OctokitTypes';
import { JIRA_DOMAIN, JIRA_ISSUE_PATTERN } from '../lib/Constants';

interface IssueParameters {
  issuetype: { name: string };
  parent?: { key: string };
}

class PullRequestCreated extends OctokitAction {
  protected async execute(): Promise<void> {
    const pr = await this.getPullRequest(this.payload.pull_request.number);
    if (pr == null) {
      return;
    }
    let newTitle = pr.title.replace(/\s\s+/g, " ").trim();  // Mainly remove triple space between issue ID and title when copying from Jira
    const linkedIssues = pr.title?.match(JIRA_ISSUE_PATTERN) || null;
    if (linkedIssues == null) {
      const parameters = await this.newIssueParameters(pr);
      const projectKey = this.getInput('jira-project');
      const issueKey = await this.jira.createIssue(projectKey, pr.title, this.additionalFields(parameters));
      if (issueKey != null) {
        newTitle = `${issueKey} ${newTitle}`;
        await this.updatePullRequestDescription(pr.number, `${this.issueLink(issueKey)}\n\n${pr.body || ''}`);
        await this.jira.moveIssue(issueKey, 'Commit');  // OPEN  -> TO DO
        await this.jira.moveIssue(issueKey, 'Start');   // TO DO -> IN PROGRESS
        const userEmail = await this.findEmail(this.payload.sender.login);
        if (userEmail != null) {
          await this.jira.assignIssue(issueKey, userEmail);
        }
      }
    } else {
      const mentionedIssues = this.findMentionedIssues(pr);
      const notMentionedIssues = linkedIssues.filter(x => !mentionedIssues.has(x));
      console.log(`Adding the following ticket in description: ${notMentionedIssues}`);
      if (notMentionedIssues.length > 0) {
        await this.updatePullRequestDescription(pr.number, `${notMentionedIssues.map(x => this.issueLink(x)).join('\n')}\n\n${pr.body || ''}`);
      }
    }
    if (pr.title !== newTitle) {
      await this.updatePullRequestTitle(pr.number, newTitle);
    }
  }

  private additionalFields(parameters: IssueParameters): any {
    return { ...this.parseAdditionalFields(), ...parameters }
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

  private async newIssueParameters(pr: PullRequest): Promise<IssueParameters> {
    const mentionedIssues = this.findMentionedIssues(pr);
    console.log('Looking for a non-Sub-task ticket');
    const parent = await this.firstNonSubTask(mentionedIssues);
    console.log(`Parent issue: ${parent?.key} (${parent?.fields.issuetype.name})`);
    switch (parent?.fields.issuetype.name) {
      case 'Epic':
        return { issuetype: { name: 'Task' }, parent: { key: parent.key } };
      case 'Sub-task':
      case undefined:
      case null:
        return { issuetype: { name: 'Task' } };
      default:
        return { issuetype: { name: 'Sub-task' }, parent: { key: parent.key } };
    }
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
    const mentionedIssues = pr.body?.match(JIRA_ISSUE_PATTERN) || [];
    console.log(`Found mentioned issues: ${mentionedIssues} (prior to distinct)`);
    return new Set(mentionedIssues);
  }

  private issueLink(issue: string): string {
    return `[${issue}](${JIRA_DOMAIN}/browse/${issue})`;
  }
}

const action = new PullRequestCreated();
action.run();
