"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.PullRequestClosed = void 0;
const PullRequestAction_1 = require("../lib/PullRequestAction");
class PullRequestClosed extends PullRequestAction_1.PullRequestAction {
    async processJiraIssue(issueId) {
        if (this.isEngXpSquad) { // Can't auto-close auto-created issues, the reporter is set to the actual user
            const pr = await this.loadPullRequest(this.payload.pull_request.number);
            if (pr.user.type === "Bot") {
                await this.jira.moveIssue(issueId, 'Resolve issue', { resolution: { id: this.resolutionId() } });
            }
            else {
                this.log(`Skipping issue resolution for non-Bot PR`);
            }
        }
        else if (this.payload.pull_request.merged) {
            await this.processMerge(issueId);
        }
        else {
            await this.processClose(issueId);
        }
    }
    async processMerge(issueId) {
        const transition = await this.jira.findTransition(issueId, this.isReleaseBranch(this.payload.pull_request.base.ref) ? 'Merge into master' : 'Merge into branch');
        if (transition == null) {
            await this.jira.moveIssue(issueId, 'Merge');
        }
        else {
            await this.jira.transitionIssue(issueId, transition);
        }
    }
    async processClose(issueId) {
        const issue = await this.jira.loadIssue(issueId);
        const creator = issue?.fields.creator.displayName || null;
        if (creator === "Jira Tech User GitHub") {
            await this.jira.moveIssue(issueId, 'Cancel Issue', { resolution: { id: this.resolutionId() } });
        }
        else {
            this.log(`Skipping issue cancellation for creator ${creator}`);
        }
    }
    isReleaseBranch(ref) {
        return ref === 'master' || ref === 'main' || ref.startsWith('branch-');
    }
    resolutionId() {
        return this.payload.pull_request.merged
            ? '10000' // "Done"
            : '10001'; // "Won't do"
    }
}
exports.PullRequestClosed = PullRequestClosed;
//# sourceMappingURL=PullRequestClosed.js.map