import { OctokitAction } from '../lib/OctokitAction';
import { PullRequest } from '../lib/OctokitTypes';
import { JIRA_ISSUE_PATTERN } from '../lib/Constants';

class PullRequestCreated extends OctokitAction {
  protected async execute(): Promise<void> {
    const pr = await this.getPullRequest(this.payload.pull_request.number);
    if (pr == null) {
      console.log('Pull request not found.');
      return;
    }
    if (this.shouldCreateIssue(pr)) {
      const projectKey = this.getInput('jira-project');
      const issueType = await this.jira.findIssueType(projectKey, 'Task');
      if (issueType != null) {
        const issueKey = await this.jira.createIssue(projectKey, issueType, pr.title);
        this.updatePullRequestTitle(this.payload.pull_request.number, `${issueKey} ${pr.title}`);
        this.updatePullRequestDescription(this.payload.pull_request.number, `${issueKey}\n\n${pr.body || ''}`);
      }
    }
  }

  private shouldCreateIssue(pr: PullRequest): boolean {
    return !JIRA_ISSUE_PATTERN.test(pr.title);
  }
}

const action = new PullRequestCreated();
action.run();
