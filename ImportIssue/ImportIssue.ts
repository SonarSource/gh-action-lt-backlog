import { AtlassianDocument } from '../lib/AtlassianDocumentFormat';
import { NewIssueParameters } from '../lib/NewIssueParameters';
import { OctokitAction } from '../lib/OctokitAction';
import { Issue } from '../lib/OctokitTypes';

class ImportIssue extends OctokitAction {
  protected async execute(): Promise<void> {

    const issue_number = 9690;
    //const issue_number = 9657;

    const issue = await this.getIssue(issue_number);
    if (issue) {
      const parameters: NewIssueParameters = {
        issuetype: { name: this.issueType(issue) },
        description: AtlassianDocument.fromMarkdown(issue.body ?? ''),
      };

      const id = await this.jira.createIssue(this.getInput('jira-project'), issue.title, parameters);
      console.log(`Created ${id}`);
      // FIXME: Components from "Type: " labels. Take each label, remove "Type"
      // await this.addJiraComponent(id, "fixme", null);

      await this.jira.addIssueRemoteLink(id, issue.html_url);
    }
  }

  private issueType(issue: Issue): string {
    const data: { name, type }[] = [
      { name: 'Type: Bug', type: 'Bug' },
      { name: 'Type: CFG/SE FPs', type: 'False Positive' },
      { name: 'Type: Code Fix', type: 'Improvement' },
      { name: 'Type: Coverage', type: 'Improvement' },
      { name: 'Type: False Negative', type: 'False Negative' },
      { name: 'Type: False Positive', type: 'False Positive' },
      { name: 'Type: Messages', type: 'Improvement' },
      { name: 'Type: New Rule', type: 'New Feature' },
      { name: 'Type: Performance', type: 'Improvement' },
      { name: 'Type: RSPEC', type: 'Improvement' },
      { name: 'Type: Rule Idea', type: 'New Feature' },
      { name: 'Type: Rule rework', type: 'Improvement' },
      { name: 'Type: SE', type: 'Improvement' },
      { name: 'Type: Utility', type: 'Improvement' },
      { name: 'Type: UX', type: 'Improvement' },
      { name: 'Type: Web', type: 'Improvement' },
    ];
    return data.find(x => this.hasLabel(issue, x.name))?.type ?? "Task";
  }

  private hasLabel(issue: Issue, label: string): boolean {
    return issue.labels.some(x => typeof x === 'object' && x.name === label);
  }
}

const action = new ImportIssue();
action.run();

