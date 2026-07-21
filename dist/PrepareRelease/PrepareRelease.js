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
import { Config } from '../lib/Configuration.js';
import { JIRA_DOMAIN } from '../lib/Constants.js';
export class PrepareRelease extends LockBranchAction {
    resolveLockBranch() {
        return true; // Preparing a release locks the branch
    }
    async execute() {
        const boardName = this.inputString('board');
        if (Config.findTeam(boardName) == null) {
            // Fail fast: do not lock the branch or post to Slack for an unknown board
            this.setFailed(`Unknown board '${boardName}'. It must match a team name in TeamConfigurationData.`);
            return;
        }
        await super.execute();
    }
    async buildSlackMessage(pattern) {
        const tickets = await this.buildTicketList();
        const suffix = tickets ? `\n${tickets}` : '';
        return `${this.repo.repo}: The branch \`${pattern}\` was locked for release :ice_cube:${suffix}`;
    }
    async buildTicketList() {
        const status = this.inputString('status');
        const team = Config.findTeam(this.inputString('board')); // Already validated in execute()
        this.log(`Board '${team.name}' resolved to boardId ${team.boardId}`);
        const escapedStatus = status.replace(/\\/g, '\\\\').replace(/"/g, '\\"'); // Escape for the JQL double-quoted literal
        const issues = await this.jira.findBoardIssues(team.boardId, `status = "${escapedStatus}"`);
        this.log(`Found ${issues.length} issue(s) in '${status}'`);
        if (issues.length === 0) {
            return 'No tickets to validate.';
        }
        const groups = new Map();
        for (const issue of issues) {
            const assignee = issue.fields.assignee ?? null;
            const groupKey = assignee?.accountId ?? '';
            const group = groups.get(groupKey) ?? { assignee, keys: [] };
            group.keys.push(issue.key);
            groups.set(groupKey, group);
        }
        const lines = ['Tickets to validate:'];
        for (const { assignee, keys } of groups.values()) {
            lines.push(`- ${await this.mention(assignee)}`);
            for (const key of keys) {
                lines.push(`  • ${this.ticketLink(key)}`);
            }
        }
        return lines.join('\n');
    }
    async mention(assignee) {
        if (assignee == null) {
            return 'Unassigned';
        }
        // Slack only resolves a mention from a user ID, so look it up by email; display names with spaces do not work
        const slackId = assignee.emailAddress ? await this.findSlackUserId(assignee.emailAddress) : null;
        return slackId ? `<@${slackId}>` : assignee.displayName;
    }
    ticketLink(key) {
        return `<${JIRA_DOMAIN}/browse/${key}|${key}>`;
    }
}
//# sourceMappingURL=PrepareRelease.js.map