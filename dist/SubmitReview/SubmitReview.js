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
import { NIGEL_ACCOUNT_ID } from '../lib/Constants.js';
import { PullRequestAction } from '../lib/PullRequestAction.js';
export class SubmitReview extends PullRequestAction {
    async processJiraIssue(pr, issueId) {
        if (this.payload.review.state === 'approved') {
            if (pr.isBot()) { // Including Nigel
                await this.assignCurrentUser(issueId); // When these start by approving PR instead of moving the card, they end up without a face
            }
            if (this.isEngXpSquad) {
                const userEmail = await this.findEmail(this.payload.sender?.login);
                if (userEmail) {
                    await this.jira.addReviewedBy(issueId, userEmail);
                }
            }
            else {
                await this.jira.moveIssue(issueId, 'Approve');
            }
        }
        else if (this.payload.review.state === 'changes_requested') {
            await this.jira.moveIssue(issueId, 'Request Changes');
        }
    }
    async assignCurrentUser(issueId) {
        const issue = await this.jira.loadIssue(issueId);
        if (!issue.fields.assignee || issue.fields.assignee.accountId === NIGEL_ACCOUNT_ID) {
            const userEmail = await this.findEmail(this.payload.sender?.login);
            if (userEmail) {
                await this.jira.assignIssueToEmail(issueId, userEmail);
            }
        }
    }
}
//# sourceMappingURL=SubmitReview.js.map