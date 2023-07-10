import { OctokitAction } from '../lib/OctokitAction';
import { Issue } from '../lib/OctokitTypes';
import { ColumnId, ProjectContent, ProjectContentV1, ProjectContentV2 } from '../lib/ProjectContent';

class CreateCardForStandalonePR extends OctokitAction {
  protected async execute(): Promise<void> {
    let column_id: ColumnId = this.getInput('column-id');
    const projectNumber = this.getInput('project-number');
    let project: ProjectContent;
    if (projectNumber) {
      project = await ProjectContentV2.fromProject(this, parseInt(projectNumber))
    } else {
      column_id = parseInt(column_id);
      project = await ProjectContentV1.fromColumn(this, column_id);
    }

    const pr = this.payload.pull_request as Issue;
    const fixedIssues = this.fixedIssues(pr);
    if (fixedIssues.length === 0) {
      await this.addAssignee(pr, this.payload.sender.login);
      await project.createCard(pr, column_id);
    } else {
      this.log(`Skip, fixes issues`);
    }
  }
}

const action = new CreateCardForStandalonePR();
action.run();
