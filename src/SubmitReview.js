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
import { JIRA_ISSUE_PATTERN, NIGEL_ACCOUNT_ID, TEAM_REVIEW_PREFIX } from './helpers/Constants.js';
import { PullRequestAction } from './helpers/PullRequestAction.js';
import { runAction } from './helpers/RunAction.js';

export class SubmitReview extends PullRequestAction {
  async processJiraIssue(pr, issueId) {
    if (this.payload.review.state === 'approved') {
      if (pr.isBot()) {
        // Including Nigel
        await this.assignCurrentUser(issueId); // When these start by approving PR instead of moving the card, they end up without a face
      }
      if (this.isEngXpSquad) {
        const userEmails = await this.findEmails(this.payload.sender?.login);
        await this.jira.addReviewedBy(issueId, userEmails);
      } else {
        await this.jira.moveIssue(issueId, 'Approve');
      }
    } else if (this.payload.review.state === 'changes_requested') {
      await this.jira.moveIssue(issueId, 'Request Changes');
    }
  }
  async afterExecute(pr) {
    if (this.payload.review.state === 'approved') {
      for (const comment of await this.listComments(pr.number)) {
        const teamReviewIssueId = await this.approvedTeamReviewIssueId(comment.body);
        if (teamReviewIssueId) {
          await this.jira.moveIssue(teamReviewIssueId, 'Resolve issue'); // Move to RESOLVED
          await this.jira.moveIssue(teamReviewIssueId, 'Close Issue'); // Move to DONE
        }
      }
    }
  }
  async assignCurrentUser(issueId) {
    const issue = await this.jira.loadIssue(issueId);
    if (!issue.fields.assignee || issue.fields.assignee.accountId === NIGEL_ACCOUNT_ID) {
      const userEmails = await this.findEmails(this.payload.sender?.login);
      await this.jira.assignIssueToEmail(issueId, userEmails);
    }
  }
  async approvedTeamReviewIssueId(body) {
    if (body?.startsWith(TEAM_REVIEW_PREFIX)) {
      const issueId = body.match(JIRA_ISSUE_PATTERN) ?? null;
      const teamSlug = body.match(/<!--slug: ([^ ]+) -->/) ?? null;
      if (issueId && teamSlug) {
        const members = await this.listTeamMembers(teamSlug[1]);
        if (members.some(x => x.login === this.payload.sender?.login)) {
          return issueId[0];
        }
      }
    }
    return null;
  }
}

runAction(import.meta.url, SubmitReview);
