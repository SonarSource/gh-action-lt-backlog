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
import { JIRA_DOMAIN } from '../lib/Constants.js';
const VALIDATION_STATUS = 'In Validation';
export class AnnounceRelease extends LockBranchAction {
    resolveLockBranch() {
        return true;
    }
    async buildSlackMessage(pattern, lockBranch) {
        const message = await super.buildSlackMessage(pattern, lockBranch);
        const tickets = await this.buildTicketList();
        return tickets ? `${message}\n${tickets}` : message;
    }
    async buildTicketList() {
        const project = this.inputString('project');
        const issues = await this.jira.findAllIssues(`project = ${JSON.stringify(project)} AND status = ${JSON.stringify(VALIDATION_STATUS)}`);
        this.log(`Found ${issues.length} issue(s) in '${VALIDATION_STATUS}'`);
        if (issues.length === 0) {
            return 'No tickets to validate.';
        }
        const groups = Map.groupBy(issues, issue => issue.fields.assignee?.displayName ?? 'Unassigned');
        let message = 'Tickets to validate:';
        for (const group of groups.values()) {
            message += `\n- ${await this.mention(group[0].fields.assignee ?? null)}`;
            for (const issue of group) {
                message += `\n  * ${this.ticketLink(issue.key)}`;
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
        return `<${JIRA_DOMAIN}/browse/${key}|${key}>`;
    }
}
//# sourceMappingURL=AnnounceRelease.js.map