import { EngineeringExperienceSquad } from '../Data/TeamConfiguration';
import { Config } from '../lib/Configuration';
import { PullRequestAction } from '../lib/PullRequestAction';

export class SubmitReview extends PullRequestAction {

  protected async processJiraIssue(issueId: string): Promise<void> {
    if (this.payload.review.state === 'approved') {
      if (this.isEngXpSquad) {
        const userEmail = await this.findEmail(this.payload.sender.login);
        if (userEmail) {
          await this.jira.addReviewedBy(issueId, userEmail);
        }
        const team = Config.findTeam(EngineeringExperienceSquad.name);
        const sprintId = await this.jira.findSprintId(team.boardId);
        await this.jira.setSprint(issueId, sprintId);
      } else {
        await this.jira.moveIssue(issueId, 'Approve');
      }
    } else if (this.payload.review.state === 'changes_requested') {
      await this.jira.moveIssue(issueId, 'Request Changes');
    }
  }
}
