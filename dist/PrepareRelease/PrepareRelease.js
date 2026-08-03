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
export class PrepareRelease extends LockBranchAction {
    resolveLockBranch() {
        return true;
    }
    async execute() {
        const project = this.inputString('project');
        if (await this.jira.loadProject(project) == null) {
            this.setFailed(`Unknown Jira project '${project}'.`);
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
        const project = this.inputString('project');
        const status = this.inputString('status');
        const jql = `project = ${JSON.stringify(project)} AND status = ${JSON.stringify(status)}`;
        const issues = await this.jira.findAllIssues(jql);
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
        const slackUsers = await this.loadSlackUserIdsByName();
        const lines = ['Tickets to validate:'];
        for (const { assignee, keys } of groups.values()) {
            lines.push(`- ${this.mention(assignee, slackUsers)}`);
            for (const key of keys) {
                lines.push(`  • ${this.ticketLink(key)}`);
            }
        }
        return lines.join('\n');
    }
    mention(assignee, slackUsers) {
        if (assignee == null) {
            return 'Unassigned';
        }
        const slackId = slackUsers.get(this.normalizeName(assignee.displayName));
        return slackId ? `<@${slackId}>` : assignee.displayName;
    }
    ticketLink(key) {
        return `<${JIRA_DOMAIN}/browse/${key}|${key}>`;
    }
}
//# sourceMappingURL=PrepareRelease.js.map