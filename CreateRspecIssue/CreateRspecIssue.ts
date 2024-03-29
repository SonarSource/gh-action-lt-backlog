import { OctokitAction } from '../lib/OctokitAction';

class CreateRspecIssue extends OctokitAction {
  protected async execute(): Promise<void> {
    this.log('Creating issue');
    const { data: issue } = await this.rest.issues.create(
      this.addRepo({
        title: `Update RSPEC before ${this.payload.milestone.title} release`,
        body: this.getInput("body"),
        milestone: this.payload.milestone.number,
        labels: ['Type: Tooling'],
      }),
    );
    this.log(`Created issue #${issue.number}: ${issue.html_url}`);
    await this.createCard(issue, this.getInputNumber('column-id'));
  }
}

const action = new CreateRspecIssue();
action.run();
