import { OctokitAction } from '../lib/OctokitAction';
import { PullRequest } from '../lib/OctokitTypes';
import { JIRA_ISSUE_PATTERN } from '../lib/Constants';

interface Issue {
  type: string;
  parent?: string;
}

class PullRequestCreated extends OctokitAction {
  protected async execute(): Promise<void> {
    const pr = await this.getPullRequest(this.payload.pull_request.number);
    if (this.shouldCreateIssue(pr)) {
      const issue = await this.newIssueTypeAndParent(pr);
      const projectKey = this.getInput('jira-project', true);
      const issueKey = await this.jira.createIssue(projectKey, issue.type, pr.title, { parent: { key: issue.parent } });
      await this.updatePullRequestTitle(this.payload.pull_request.number, `${issueKey} ${pr.title}`);
      await this.updatePullRequestDescription(this.payload.pull_request.number, `${issueKey}\n\n${pr.body || ''}`);
    }
  }

  private shouldCreateIssue(pr: PullRequest): boolean {
    return pr != null && !JIRA_ISSUE_PATTERN.test(pr.title);
  }

  private async newIssueTypeAndParent(pr: PullRequest): Promise<Issue> {
    const mentionnedIssues = this.findMentionnedIssues(pr);
    console.log(`Found ${mentionnedIssues.length} mentionned issues: ${mentionnedIssues}`);
    let parent = mentionnedIssues.length === 1 ? await this.jira.getIssue(mentionnedIssues[0]) : null;
    console.log(`Parent issue: ${parent?.key} (${parent?.fields.issuetype.name})`);
    switch (parent?.fields.issuetype.name) {
      case 'Epic':
        return { type: 'Task', parent: parent.key };
      case 'Task':
        return { type: 'Sub-task', parent: parent.key };
      default:
        return { type: 'Task' };
    }
  }

  private findMentionnedIssues(pr: PullRequest): string[] {
    return pr.body?.match(JIRA_ISSUE_PATTERN) || [];
  }
}

const action = new PullRequestCreated();
action.run();
