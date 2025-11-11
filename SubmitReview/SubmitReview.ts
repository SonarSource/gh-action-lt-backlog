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

import { PullRequestAction } from '../lib/PullRequestAction';

export class SubmitReview extends PullRequestAction {

  protected async processJiraIssue(issueId: string): Promise<void> {
    if (this.payload.review.state === 'approved') {
      if (this.isEngXpSquad) {
        const userEmail = await this.findEmail(this.payload.sender.login);
        if (userEmail) {
          await this.jira.addReviewedBy(issueId, userEmail);
        }
      } else {
        await this.jira.moveIssue(issueId, 'Approve');
      }
    } else if (this.payload.review.state === 'changes_requested') {
      await this.jira.moveIssue(issueId, 'Request Changes');
    }
  }
}
