import { PullRequestAction } from '../lib/PullRequestAction';

class RequestReview extends PullRequestAction {
  protected async processJiraIssue(issueId: string): Promise<void> {
    this.moveIssue(issueId, 'Request Review');
    const userEmail = 'sebastien.marichal@sonarsource.com'; // FIXME: Map GitHub user to Jira user
    if (userEmail != null) {
      this.jira.assignIssue(issueId, userEmail);
    }
  }
}

const action = new RequestReview();
action.run();
