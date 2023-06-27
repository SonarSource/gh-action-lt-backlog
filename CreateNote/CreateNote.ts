import { OctokitAction } from '../lib/OctokitAction';

class CreateNote extends OctokitAction {
  protected async execute(): Promise<void> {
    await this.createNote(this.getInput("note"), this.getInputNumber("column-id"));
  }
}

const action = new CreateNote();
action.run();
