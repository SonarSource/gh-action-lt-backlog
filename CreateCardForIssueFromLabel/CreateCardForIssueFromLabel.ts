import { IssueOrPR } from '../lib/IssueOrPR';
import { OctokitAction } from '../lib/OctokitAction';
import { ProjectContent } from '../lib/ProjectContent';

class CreateCardForIssueFromLabel extends OctokitAction {
  protected async execute(): Promise<void> {
    const labelPrefix = this.getInput('label-prefix');
    const labelName = this.payload.label.name;
    const project = await ProjectContent.FromProject(this, this.getInputNumber('project-id'));
    if (labelName.startsWith(labelPrefix)) {
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
