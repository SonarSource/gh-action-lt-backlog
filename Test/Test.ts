import { OctokitAction } from '../lib/OctokitAction';

class Test extends OctokitAction {
  protected async execute(): Promise<void> {
    //const userEmail = await this.findEmail(this.getInput('login'));
    const userEmail = 'N/A';
    this.log(`Result: ${userEmail}`);
  }
}

const action = new Test();
action.run();
