/*
 * Backlog Automation
 * Copyright (C) SonarSource Sàrl
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

import { OctokitAction } from '../lib/OctokitAction.js';
import { JIRA_TECH_USER_GITHUB_ACCOUNT_ID } from '../lib/Constants.js';

export class CleanupIssues extends OctokitAction {
  protected async execute(): Promise<void> {
    const project = this.inputString('jira-project');
    const issues = await this.jira.findIssues(`project=${JSON.stringify(project)} AND status IN ("Open", "To Do") AND creator="${JIRA_TECH_USER_GITHUB_ACCOUNT_ID}" ORDER BY created ASC`); // Only first page of results
    this.log(`Found ${issues.length} issue(s) to check`);
    let canceled = 0;
    for (const issue of issues) {
      if (await this.isAbandoned(issue.key)) {
        await this.jira.moveIssue(issue.key, 'Cancel Issue', { resolution: { id: '10001' } });  // Won't do
        canceled += 1;
      }
    }
    this.log(`Cancelled ${canceled} of ${issues.length} issue(s)`);
  }

  private async isAbandoned(issueId: string): Promise<boolean> {
    const prNumbers = await this.findPRs(issueId);
    if (prNumbers.length === 0) {
      this.log(`${issueId}: No pull request from this repository is linked, skipping`);
      return false;
    }
    for (const prNumber of prNumbers) { // Issue can be linked to multiple PRs. All of them must be closed without merge.
      const pr = await this.loadPullRequest(prNumber);
      if (!pr) {
        this.log(`${issueId}: PR #${prNumber} not found, skipping`);
        return false;
      } else if (pr.state !== 'closed' || pr.merged) {
        this.log(`${issueId}: PR #${prNumber} is ${pr.merged ? 'merged' : pr.state}, skipping`);
        return false;
      }
    }
    return true;
  }

  private async findPRs(issueId: string): Promise<number[]> {
    const prefix = `https://github.com/${this.repo.owner}/${this.repo.repo}/pull/`.toLowerCase();
    const links = await this.jira.loadIssueRemoteLinks(issueId) ?? [];
    return links
      .map(x => x.object.url.toLowerCase())
      .filter(x => x.startsWith(prefix))
      .map(x => Number.parseInt(x.substring(prefix.length), 10));
  }
}
