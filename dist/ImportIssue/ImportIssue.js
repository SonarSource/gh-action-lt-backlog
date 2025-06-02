"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const AtlassianDocumentFormat_1 = require("../lib/AtlassianDocumentFormat");
const OctokitAction_1 = require("../lib/OctokitAction");
class ImportIssue extends OctokitAction_1.OctokitAction {
    async execute() {
        const issue_number = 9690;
        const issue = await this.getIssue(issue_number);
        if (issue) {
            // FIXME: Team?
            const parameters = {
                issuetype: { name: this.issueType(issue) },
                description: AtlassianDocumentFormat_1.AtlassianDocument.fromMarkdown(issue.body ?? ''),
            };
            if (false) {
                this.logSerialized(parameters.description);
                return;
            }
            const id = await this.jira.createIssue(this.getInput('jira-project'), issue.title, parameters);
            console.log(`Created ${id}`);
            // FIXME: Components from "Type: " labels. Take each label, remove "Type"
            // await this.addJiraComponent(id, "fixme", null);
        }
    }
    issueType(issue) {
        const data = [
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
    hasLabel(issue, label) {
        return issue.labels.some(x => typeof x === 'object' && x.name === label);
    }
}
const action = new ImportIssue();
action.run();
//const node: AdfNode = new AdfNode({ type: 'paragraph', text: 'Lorem ipsum `code` dolor' });
//console.log(node);
//# sourceMappingURL=ImportIssue.js.map