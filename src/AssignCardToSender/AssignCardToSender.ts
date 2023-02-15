import { OctokitAction } from '../lib/OctokitAction';

class AssignCardToSender extends OctokitAction {
  protected async execute(): Promise<void> {
    const issue = await this.downloadData(this.payload.project_card.content_url);
    if (!issue.assignee) {
      this.addAssignee(issue, this.payload.sender.login);
    }
  }
}

const action = new AssignCardToSender();
action.run();
