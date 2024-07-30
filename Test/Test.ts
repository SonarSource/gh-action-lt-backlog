import { OctokitAction } from '../lib/OctokitAction';

class Test extends OctokitAction {
  protected async execute(): Promise<void> {
    //const userEmail = this.getInput('login');
    //this.log("Getting PR");
    //const pr = await this.getPullRequest(600);
    //this.log(`PR: ${pr.title}`);
    //const update = { title: pr.title + '.' };
    //await this.rest.pulls.update(this.addRepo({ pull_number: 600, ...update }));

    //this.log("Requesting getAuthenticated");
    //var me = await this.rest.users.getAuthenticated();
    //this.log("Received getAuthenticated");
    //this.logSerialized(me);



    this.log("findingEmail");

    const userEmail = await this.findEmail(this.getInput('login'));



    this.log(`Result: ${userEmail}`);
  }
}

const action = new Test();
action.run();
