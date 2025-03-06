import { OctokitAction } from '../lib/OctokitAction';
import { TeamConfigurationData } from '../Data/TeamConfiguration';

class Test extends OctokitAction {
  protected async execute(): Promise<void> {
    for (const team of TeamConfigurationData) {
      console.log(`Processing ${team.name} with boardId ${team.boardId}`);
      if (team.boardId) {
        try {
          await this.jira.findSprintId(team.boardId);
        }
        catch (ex) {
          console.log(ex.message);
          console.log();
        }
      }
      else {
        console.log('Skip, no boardId');
      }
    }

  }

}

const action = new Test();
action.run();
