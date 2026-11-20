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

enum PullRequestState {
  Unknown = 'Unknown',
  Open = 'Open',
  Merged = 'Merged',
  Closed = 'Closed', // Not merged
  FromDifferentRepo = 'From another repo',
}

export class CleanupIssues extends OctokitAction {
  protected async execute(): Promise<void> {
    const project = this.inputString('jira-project');
    const issues = await this.jira.findIssues(`project=${JSON.stringify(project)} AND statusCategory!=Done AND creator="${JIRA_TECH_USER_GITHUB_ACCOUNT_ID}" ORDER BY created ASC`); // Only first page of results
    this.log(`Found ${issues.length} issue(s) to check`);
    let canceled = 0;
    let done = 0;
    for (const issue of issues) {
      const prs = await this.loadPRs(issue.key);
      if(!prs){
        this.log(`${issue.key}: Remote links could not be loaded, skipping`);
      } else if (this.isEmpty(issue.key, prs) || prs.every(x => x === PullRequestState.Closed)) {
        await this.jira.moveIssue(issue.key, 'Cancel Issue', { resolution: { id: Resolution.WONT_DO } });
        canceled += 1;
      } else if (prs.every(x => x === PullRequestState.Closed || x === PullRequestState.Merged)) {
        await this.jira.moveIssue(issue.key, 'Merge');
        done += 1;
      }
    }
    this.log(`Checked ${issues.length} issue(s): ${canceled} Canceled, ${done} marked as Done`);
  }

  private isEmpty(issueId: string, prs: PullRequestState[]): boolean {
    if (prs.length === 0) {
      this.log(`${issueId}: No pull request is linked, closing`);
      return true;
    } else {
      return false;
    }
  }

  private async loadPRs(issueId: string): Promise<PullRequestState[] | null> { // null when remote links could not be loaded
    const links = await this.jira.loadIssueRemoteLinks(issueId);
    if (links === null) {
      return null;
    }
    const prefix = `https://github.com/${this.repo.owner}/${this.repo.repo}/pull/`.toLowerCase();
    const result: PullRequestState[] = [];
    for (const link of links) {
      const url = link.object.url.toLowerCase();
      const state = url.startsWith(prefix)
        ? await this.loadPRState(Number.parseInt(url.substring(prefix.length), 10))
        : PullRequestState.FromDifferentRepo;
      this.log(`${url}: ${state}`);
      result.push(state);
    }
    return result;
  }

  private async loadPRState(prNumber: number): Promise<PullRequestState> {
    const pr = await this.loadPullRequest(prNumber);
    if (!pr) {
      return PullRequestState.Unknown;
    } else if (pr.merged) {
      return PullRequestState.Merged;
    } else if (pr.state === 'closed'){
      return PullRequestState.Closed;
    } else {
      return PullRequestState.Open;
    }
  }
}
