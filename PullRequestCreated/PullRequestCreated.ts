import { OctokitAction } from '../lib/OctokitAction';
import { PullRequest } from '../lib/OctokitTypes';
import { JIRA_ISSUE_PATTERN } from '../lib/Constants';

interface IssueParameters {
  type: string;
  parent?: string;
}

class PullRequestCreated extends OctokitAction {
  protected async execute(): Promise<void> {
    const pr = await this.getPullRequest(this.payload.pull_request.number);
    if (this.shouldCreateIssue(pr)) {
      const issueParameter = await this.newIssueParameters(pr);
      const projectKey = this.getInput('jira-project');
      const issueKey = await this.jira.createIssue(projectKey, issueParameter.type, pr.title, { parent: { key: issueParameter.parent } });
      if (issueKey != null) {
        await this.updatePullRequestTitle(this.payload.pull_request.number, `${issueKey} ${pr.title}`);
        await this.updatePullRequestDescription(this.payload.pull_request.number, `${issueKey}\n\n${pr.body || ''}`);
      } else {
        console.log('Unable to update PR title and description');
      }
    }
  }

  private shouldCreateIssue(pr: PullRequest): boolean {
    return pr != null && !JIRA_ISSUE_PATTERN.test(pr.title);
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
}

const action = new PullRequestCreated();
action.run();
