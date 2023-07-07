import { IssueOrPR } from '../lib/IssueOrPR';
import { OctokitAction } from '../lib/OctokitAction';
import { ProjectContentV1 } from '../lib/ProjectContent';

class CreateCardForIssueFromLabel extends OctokitAction {
  protected async execute(): Promise<void> {
    const labelPrefix = this.getInput('label-prefix');
    const labelName = this.payload.label.name;
    if (labelName.startsWith(labelPrefix)) {
      const project = await ProjectContentV1.fromProject(this, this.getInputNumber('project-id'));
      const columnName = labelName.substring(labelPrefix.length).trim();
      const column = project.columnFromName(columnName);
      if (column) {
        await project.moveOrCreateCard(this.payload.issue as IssueOrPR, column.id);
      }
    } else {
      this.log('Unexpected label name: ' + labelName);
    }
  }
}

const action = new CreateCardForIssueFromLabel();
action.run();
