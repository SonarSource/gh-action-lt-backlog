import { OctokitAction } from '../lib/OctokitAction';
import { Issue, Label } from '../lib/OctokitTypes';

class CopyLabelToPR extends OctokitAction {
  protected async execute(): Promise<void> {
    const pr = this.payload.pull_request as Issue;
    const fixedIssues = this.fixedIssues(pr);
    if (fixedIssues.length === 0) {
      const mentionedIssues = this.mentionedIssues(pr);
      if (mentionedIssues.length === 0) {
        this.log("Skip, there are no issues mentioned");
      } else {
        const labelPrefix = this.getInput("label-prefix");
        for (const issueNumber of mentionedIssues) {
          const issue = await this.getIssue(issueNumber);
          const labels = issue.labels.map(x => x as Label).filter(x => x.name.startsWith(labelPrefix)).map(x => x.name);
          this.addLabels(pr, labels);
        }
      }
    } else {
      this.log(`Skip, fixes issues`);
    }
  }
}

const action = new CopyLabelToPR();
action.run();
