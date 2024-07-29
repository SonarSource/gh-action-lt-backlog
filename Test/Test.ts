import { OctokitAction } from '../lib/OctokitAction';

class Test extends OctokitAction {
  protected async execute(): Promise<void> {
    //const userEmail = this.getInput('login');
    this.log("Getting PR");
    const pr = await this.getPullRequest(600);

    this.log("findingEmail");

    const userEmail = await this.findEmail(this.getInput('login'));



    this.log(`Result: ${userEmail}`);
  }
}

const action = new Test();
action.run();
