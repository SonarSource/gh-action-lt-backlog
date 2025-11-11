/*
 * Backlog Automation
 * Copyright (C) 2022-2025 SonarSource Sàrl
 * mailto: info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 3 of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with this program; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
 */

import { AtlassianDocument } from '../lib/AtlassianDocumentFormat';
import { JIRA_DOMAIN } from '../lib/Constants';
import { NewIssueParameters } from '../lib/NewIssueParameters';
import { OctokitAction } from '../lib/OctokitAction';
import { Issue } from '../lib/OctokitTypes';

export class ImportIssue extends OctokitAction {
  protected async execute(): Promise<void> {
    const jiraProject = this.inputString('jira-project');
    const issue = this.payload.issue as Issue;
    if (!issue.title.startsWith(`${jiraProject}-`)) {
      const id = await this.importIssue(jiraProject, issue);
      await this.addComment(issue.number, `Internal ticket [${id}](${JIRA_DOMAIN}/browse/${id})`);
    }
  }

  private async importIssue(jiraProject: string, issue: Issue): Promise<string> {
    console.log(`Importing #${issue.number}`);
    const parameters: NewIssueParameters = {
      issuetype: { name: this.issueType(issue) },
      description: AtlassianDocument.fromMarkdown(issue.body ?? ''),
    };
    const id = await this.jira.createIssue(jiraProject, issue.title, parameters);
    console.log(`Created ${id}`);
    const promises: Promise<void>[] = [];
    promises.push(this.jira.addIssueRemoteLink(id, issue.html_url));
    promises.push(this.updateIssueTitle(issue.number, `${id} ${issue.title}`));
    for (const component of issue.labels.map(x => typeof x === 'string' ? x : x.name)) {
      promises.push(this.addJiraComponent(id, component));
    }
    await Promise.all(promises);
    return id;
  }

  private issueType(issue: Issue): string {
    const data: { name, type }[] = [
      { name: 'Bug', type: 'Bug' },
      { name: 'CFG/SE FPs', type: 'False Positive' },
      { name: 'False Negative', type: 'False Negative' },
      { name: 'False Positive', type: 'False Positive' },
      { name: 'Rule Idea', type: 'New Feature' },
    ];
    return data.find(x => this.hasLabel(issue, x.name))?.type ?? "Improvement";
  }

  private hasLabel(issue: Issue, label: string): boolean {
    return issue.labels.some(x => typeof x === 'object' && x.name === label);
  }
}
