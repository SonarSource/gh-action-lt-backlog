import { OctokitAction } from '../lib/OctokitAction';
import { PullRequest } from '../lib/OctokitTypes';
import { JIRA_ISSUE_PATTERN } from '../lib/Constants';
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
    const data = await NewIssueData.createForEngExp(this.jira, pr, await this.findEmail(this.payload.sender.login));
    const issueId = await this.jira.createIssue(data.projectKey, pr.title, data.additionalFields);
    if (issueId == null) {
      this.setFailed('Failed to create a new issue in Jira');
    } else {
      await this.jira.moveIssue(issueId, 'Commit');             // OPEN  -> TO DO
      if (data.accountId != null) {
        await this.jira.moveIssue(issueId, 'Start Progress');   // TO DO -> IN PROGRESS only for real accounts, no bots GHA-8
        await this.jira.assignIssueToAccount(issueId, data.accountId);
      }
      // ToDo: GHA-14 Process reviewers
    }
    return issueId;
  }

  private async createJiraComponent(projectKey: string, component: string): Promise<void> {
    //FIXME: GHA-12 If not exist, add component, move to JiraClient?
  }

  private async updateJiraComponent(issueId: string): Promise<void> {
    const component = this.repo.repo;
    await this.createJiraComponent(issueId.split('-')[0], component);
    //FIXME: GHA-12 Add component
  }
}

const action = new PullRequestCreatedForEngExp();
action.run();
