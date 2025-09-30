import { Config } from './Configuration';
import { JiraClient } from './JiraClient';
import { OctokitAction } from './OctokitAction';

export abstract class PullRequestAction extends OctokitAction {
  protected abstract processJiraIssue(issueId: string): Promise<void>;

  protected async execute(): Promise<void> {
    const issueIds = await this.fixedJiraIssues();
    if (issueIds.length === 0) {
      console.log('No Jira issue found in the PR title.');
    } else {
      for (const issueId of issueIds) {
        // BUILD/PREQ tickets are processed only when they are from Engineering Experience Squad repos. They should be ignored in any other repo, not to interfere with their process.
        if ((issueId.startsWith('BUILD-') || issueId.startsWith('PREQ-')) && !this.isEngXpSquad) {
          this.log(`Skipping ${issueId}`);
        }
        else {
          await this.processJiraIssue(issueId);
        }
      }
    }
  }

  private async fixedJiraIssues(): Promise<string[]> {
    const pr = await this.loadPullRequest(this.payload.pull_request.number);
    return pr
      ? (await this.findFixedIssues(pr)) ?? []
      : [];
  }

  public static async findSprintId(jira: JiraClient, teamName: string): Promise<number> {
    const team = Config.findTeam(teamName);
    if (team?.boardId) {
      return jira.findSprintId(team.boardId);
    }
    else {
      console.log(`No boardId is configured for team ${teamName}`);
      return null;
    }
  }
}
