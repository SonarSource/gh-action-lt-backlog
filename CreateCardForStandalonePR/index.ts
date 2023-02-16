import { OctokitAction } from '../lib/OctokitAction';
import { Issue } from '../lib/OctokitTypes';

class CreateCardForStandalonePR extends OctokitAction {
  protected async execute(): Promise<void> {
    const pr = this.payload.pull_request as Issue;
    const fixedIssues = this.fixedIssues(pr);
    if (fixedIssues.length === 0) {
      await this.addAssignee(pr, this.payload.sender.login);
      await this.createCard(pr, this.getInputNumber('column-id'));
    } else {
      this.log(`Skip, fixes issues`);
    }
  }
}

const action = new CreateCardForStandalonePR();
action.run();
