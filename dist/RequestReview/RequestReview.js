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
import { PullRequestAction } from '../lib/PullRequestAction.js';
import { TeamReviewData } from '../lib/TeamReviewData.js';
export class RequestReview extends PullRequestAction {
    async processJiraIssue(pr, issueId) {
        const component = this.inputString('team-review-component');
        const teamReview = await TeamReviewData.create(this.payload.requested_team ?? null, async () => await this.loadSenderAccountId());
        await this.processRequestReview(pr, issueId, component, this.payload.requested_reviewer ?? null, teamReview);
    }
}
//# sourceMappingURL=RequestReview.js.map