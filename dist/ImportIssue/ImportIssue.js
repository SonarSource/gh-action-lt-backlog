"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const AtlassianDocumentFormat_1 = require("../lib/AtlassianDocumentFormat");
const Constants_1 = require("../lib/Constants");
const OctokitAction_1 = require("../lib/OctokitAction");
class ImportIssue extends OctokitAction_1.OctokitAction {
    async execute() {
        const jiraProject = this.inputString('jira-project');
        const issue = this.payload.issue;
        if (!issue.title.startsWith(`${jiraProject}-`)) {
            const id = await this.importIssue(jiraProject, issue);
            await this.addComment(issue.number, `Internal ticket [${id}](${Constants_1.JIRA_DOMAIN}/browse/${id})`);
        }
    }
    async importIssue(jiraProject, issue) {
        console.log(`Importing #${issue.number}`);
        const parameters = {
            issuetype: { name: this.issueType(issue) },
            description: AtlassianDocumentFormat_1.AtlassianDocument.fromMarkdown(issue.body ?? ''),
        };
        const id = await this.jira.createIssue(jiraProject, issue.title, parameters);
        console.log(`Created ${id}`);
        const promises = [];
        promises.push(this.jira.addIssueRemoteLink(id, issue.html_url));
        promises.push(this.updateIssueTitle(issue.number, `${id} ${issue.title}`));
        for (const component of issue.labels.map(x => typeof x === 'string' ? x : x.name)) {
            promises.push(this.addJiraComponent(id, component));
        }
        await Promise.all(promises);
        return id;
    }
    issueType(issue) {
        const data = [
            { name: 'Bug', type: 'Bug' },
            { name: 'CFG/SE FPs', type: 'False Positive' },
            { name: 'False Negative', type: 'False Negative' },
            { name: 'False Positive', type: 'False Positive' },
            { name: 'Rule Idea', type: 'New Feature' },
        ];
        return data.find(x => this.hasLabel(issue, x.name))?.type ?? "Improvement";
    }
    hasLabel(issue, label) {
        return issue.labels.some(x => typeof x === 'object' && x.name === label);
    }
}
const action = new ImportIssue();
action.run();
//# sourceMappingURL=ImportIssue.js.map