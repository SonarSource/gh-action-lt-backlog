import { OctokitAction } from '../lib/OctokitAction';
import { PullRequest } from '../lib/OctokitTypes';
import { JIRA_ISSUE_PATTERN, JIRA_TASK_ISSUE } from '../lib/Constants';
import { Console } from 'console';

class PullRequestCreated extends OctokitAction {
  protected async execute(): Promise<void> {
    const pr = await this.getPullRequest(this.payload.pull_request.number);
    const linkedIssues = pr?.title?.match(JIRA_ISSUE_PATTERN) || null;
    if (pr != null && linkedIssues == null) {
      const projectKey = this.getInput('jira-project');
      const issueKey = await this.jira.createIssue(projectKey, JIRA_TASK_ISSUE, pr.title);
      await this.updatePullRequestTitle(this.payload.pull_request.number, `${issueKey} ${pr.title}`);
      await this.updatePullRequestDescription(this.payload.pull_request.number, `${issueKey}\n\n${pr.body || ''}`);
    } else if (pr != null) {
      const mentionedIssues = this.findMentionedIssues(pr);
      const notMentionedIssues = linkedIssues.filter(issue => !mentionedIssues.includes(issue));
      console.log(`Adding the following ticket in description: ${notMentionedIssues}`);
      if (notMentionedIssues.length > 0) {
        await this.updatePullRequestDescription(this.payload.pull_request.number, `${notMentionedIssues.join('\n')}\n\n${pr.body || ''}`);
      }
    }
  }

  private findMentionedIssues(pr: PullRequest): string[] {
    return pr.body?.match(JIRA_ISSUE_PATTERN) || [];
  }
}

const action = new PullRequestCreated();
action.run();
