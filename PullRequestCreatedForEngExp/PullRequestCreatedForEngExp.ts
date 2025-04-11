import { OctokitAction } from '../lib/OctokitAction';
import { PullRequest } from '../lib/OctokitTypes';
import { JIRA_DOMAIN, JIRA_ISSUE_PATTERN } from '../lib/Constants';
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
    // FIXME: Implement
    return null;
  }

  private async createJiraComponent(projectKey: string, component: string): Promise<void> {
    //FIXME: If not exist, add component
  }

  private async updateJiraComponent(issueId: string): Promise<void> {
    const component = this.repo.repo;
    await this.createJiraComponent(issueId.split('-')[0], component);
    //FIXME: Add component
  }
}

const action = new PullRequestCreatedForEngExp();
action.run();
