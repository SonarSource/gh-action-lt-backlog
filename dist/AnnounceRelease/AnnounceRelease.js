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
import { LockBranchAction } from '../lib/LockBranchAction.js';
export class AnnounceRelease extends LockBranchAction {
    resolveLockBranch() {
        return true;
    }
    async buildSlackMessage(pattern, lockBranch) {
        const message = await super.buildSlackMessage(pattern, lockBranch);
        return `${message}\nLocked for release.\n${await this.buildTicketList()}`;
    }
    async buildTicketList() {
        const project = this.inputString('project');
        const issues = await this.jira.findIssues(`project = ${JSON.stringify(project)} AND status = "In Validation"`);
        this.log(`Found ${issues.length} issue(s)`);
        if (issues.length === 0) {
            return 'No tickets to validate.';
        }
        const groups = Map.groupBy(issues, x => x.fields.assignee?.displayName ?? 'Unassigned');
        let message = 'Tickets to validate:';
        for (const group of groups.values()) {
            message += `\n- ${await this.mention(group[0].fields.assignee ?? null)}`;
            for (const issue of group) {
                message += `\n  • ${this.ticketLink(issue.key)} ${issue.fields.summary}`;
            }
        }
        return message;
    }
    async mention(assignee) {
        if (assignee == null) {
            return 'Unassigned';
        }
        const slackId = await this.slack.findUserByEmail(assignee.emailAddress);
        return slackId ? `<@${slackId}>` : assignee.displayName;
    }
    ticketLink(key) {
        return `<${this.issueUrl(key)}|${key}>`;
    }
}
//# sourceMappingURL=AnnounceRelease.js.map