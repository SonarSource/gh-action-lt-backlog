import { OctokitAction } from '../lib/OctokitAction';

class RequestReview extends OctokitAction {
  protected async execute(): Promise<void> {
    this.log("Lorem ipsum");
    const pr = await this.getPullRequest(1);
    this.log(pr.title);
    // FIXME: Move card
    // FIXME: Change assignee


  }
}

const action = new RequestReview();
action.run();
