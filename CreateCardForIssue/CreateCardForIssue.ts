import { IssueOrPR } from '../lib/IssueOrPR';
import { OctokitAction } from '../lib/OctokitAction';

class CreateCardForIssue extends OctokitAction {
  protected async execute(): Promise<void> {
    await this.createCard(this.payload.issue as IssueOrPR, this.getInputNumber('column-id'));
  }
}

const action = new CreateCardForIssue();
action.run();
