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
import { Resolution } from '../lib/JiraClient.js';

export class CleanupIssues extends OctokitAction {
  protected async execute(): Promise<void> {
    const project = this.inputString('jira-project');
    const issues = await this.jira.findIssues(`project=${JSON.stringify(project)} AND status IN ("Open", "To Do") AND creator="${JIRA_TECH_USER_GITHUB_ACCOUNT_ID}" ORDER BY created ASC`); // Only first page of results
    this.log(`Found ${issues.length} issue(s) to check`);
    let canceled = 0;
    for (const issue of issues) {
      if (await this.isAbandoned(issue.key)) {
        await this.jira.moveIssue(issue.key, 'Cancel Issue', { resolution: { id: Resolution.WONT_DO } });
        canceled += 1;
      }
    }
    this.log(`Cancelled ${canceled} of ${issues.length} issue(s)`);
  }

  private async isAbandoned(issueId: string): Promise<boolean> {
    const prs = await this.findPRs(issueId);
    if (prs === null) {
      this.log(`${issueId}: Remote links could not be loaded, skipping`);
      return false;
    } else if (prs.allUrls.length === 0) {
      this.log(`${issueId}: No pull request is linked, closing`);
      return true;
    } else if (prs.currentRepoPRNumbers.length === 0) {
      this.log(`${issueId}: No pull request from this repository is linked, skipping`);
      return false;
    }
    else {
      for (const prNumber of prs.currentRepoPRNumbers) { // Issue can be linked to multiple PRs. All of them must be closed without merge.
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
  }

  private async findPRs(issueId: string): Promise<{ allUrls: string[], currentRepoPRNumbers: number[] } | null> { // null when remote links could not be loaded
    const links = await this.jira.loadIssueRemoteLinks(issueId);
    if (links === null) {
      return null;
    }
    const prefix = `https://github.com/${this.repo.owner}/${this.repo.repo}/pull/`.toLowerCase();
    const allUrls = links.map(x => x.object.url.toLowerCase());
    return { allUrls, currentRepoPRNumbers: allUrls.filter(x => x.startsWith(prefix)).map(x => Number.parseInt(x.substring(prefix.length), 10)) };
  }
}
