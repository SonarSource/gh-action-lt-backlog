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
import { JIRA_ISSUE_PATTERN } from './Constants.js';
import { OctokitAction } from './OctokitAction.js';
import { addPullRequestExtensions } from './OctokitTypes.js';

export class PullRequestAction extends OctokitAction {
  async execute() {
    const payloadPr = addPullRequestExtensions(this.payload.pull_request);
    // GHA-321 Avoid race condition: PullRequestCreated handles review for newly created issues. This handles everything else.
    const issueIds =
      payloadPr.created_at === payloadPr.updated_at // This action was scheduled directly from PR creation (RequestReview), the race is on.
        ? (payloadPr.title?.match(JIRA_ISSUE_PATTERN) ?? []) // Use payload! PR with ticket number will work just fine. Standalone PR doesn't have tickets here and is handled by PullRequestCreated.
        : await this.findFixedIssues(payloadPr); // Action triggered later => normal processing, including renovate PRs with issue ID in comment
    if (issueIds.length === 0) {
      console.log('No Jira issue found in the PR title.');
      return;
    }
    const pr = await this.loadPullRequest(payloadPr.number);
    if (!pr) {
      return;
    }
    for (const issueId of issueIds) {
      // BUILD/PREQ tickets are processed only when they are from Engineering Experience Squad repos. They should be ignored in any other repo, not to interfere with their process.
      if (this.shouldSkipIssue(issueId)) {
        this.log(`Skipping ${issueId}`);
      } else {
        await this.processJiraIssue(pr, issueId);
      }
    }
    await this.afterExecute(pr);
  }
  shouldSkipIssue(issueId) {
    return (issueId.startsWith('BUILD-') || issueId.startsWith('PREQ-')) && !this.isEngXpSquad;
  }
  async afterExecute(pr) {
    // Override me
  }
}
