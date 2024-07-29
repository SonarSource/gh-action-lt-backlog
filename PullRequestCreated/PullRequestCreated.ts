import { OctokitAction } from '../lib/OctokitAction';
import { PullRequest } from '../lib/OctokitTypes';
import { JIRA_ISSUE_PATTERN, JIRA_TASK_ISSUE } from '../lib/Constants';

class PullRequestCreated extends OctokitAction {
  protected async execute(): Promise<void> {
    const pr = await this.getPullRequest(this.payload.pull_request.number);
    if (this.shouldCreateIssue(pr)) {
      const projectKey = this.getInput('jira-project');
      const issueKey = await this.jira.createIssue(projectKey, JIRA_TASK_ISSUE, pr.title);
      await this.updatePullRequestTitle(this.payload.pull_request.number, `${issueKey} ${pr.title}`);
      await this.updatePullRequestDescription(this.payload.pull_request.number, `${issueKey}\n\n${pr.body || ''}`);
    }
  }

  private shouldCreateIssue(pr: PullRequest): boolean {
    return pr != null && !JIRA_ISSUE_PATTERN.test(pr?.title);
  }
}

const action = new PullRequestCreated();
action.run();
