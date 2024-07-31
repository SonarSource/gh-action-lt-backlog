import { OctokitAction } from '../lib/OctokitAction';
import { PullRequest } from '../lib/OctokitTypes';
import { JIRA_DOMAIN, JIRA_ISSUE_PATTERN } from '../lib/Constants';

interface IssueParameters {
  type: string;
  parent?: string;
}

class PullRequestCreated extends OctokitAction {
  protected async execute(): Promise<void> {
    const pr = await this.getPullRequest(this.payload.pull_request.number);
    if (pr == null) {
      return;
    }
    const linkedIssues = pr.title?.match(JIRA_ISSUE_PATTERN) || null;
    if (linkedIssues == null) {
      const parameters = await this.newIssueParameters(pr);
      const projectKey = this.getInput('jira-project');
      const issueKey = await this.jira.createIssue(projectKey, parameters.type, pr.title, { parent: { key: parameters.parent } });
      if (issueKey != null) {
        await this.updatePullRequestTitle(this.payload.pull_request.number, `${issueKey} ${pr.title}`);
        await this.updatePullRequestDescription(this.payload.pull_request.number, `${this.issueLink(issueKey)}\n\n${pr.body || ''}`);
      }
    } else {
      const mentionedIssues = this.findMentionedIssues(pr);
      const notMentionedIssues = linkedIssues.filter(x => !mentionedIssues.includes(x));
      console.log(`Adding the following ticket in description: ${notMentionedIssues}`);
      if (notMentionedIssues.length > 0) {
        await this.updatePullRequestDescription(this.payload.pull_request.number, `${notMentionedIssues.map(x => this.issueLink(x)).join('\n')}\n\n${pr.body || ''}`);
      }
    }
  }

  private async newIssueParameters(pr: PullRequest): Promise<IssueParameters> {
    const mentionedIssues = this.findMentionedIssues(pr);
    console.log(`Found mentioned issues: ${mentionedIssues}`);
    const parent = mentionedIssues.length === 1 ? await this.jira.getIssue(mentionedIssues[0]) : null;
    console.log(`Parent issue: ${parent?.key} (${parent?.fields.issuetype.name})`);
    switch (parent?.fields.issuetype.name) {
      case 'Epic':
        return { type: 'Task', parent: parent.key };
      case 'Sub-task':
      case undefined:
      case null:
        return { type: 'Task' };
      default:
        return { type: 'Sub-task', parent: parent.key };
    }
  }

  private findMentionedIssues(pr: PullRequest): string[] {
    return pr.body?.match(JIRA_ISSUE_PATTERN) || [];
  }

  private issueLink(issue: string): string {
    return `[${issue}](${JIRA_DOMAIN}/browse/${issue})`;
  }
}

const action = new PullRequestCreated();
action.run();
