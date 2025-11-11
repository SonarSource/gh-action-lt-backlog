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
exports.PullRequestAction = void 0;
const OctokitAction_1 = require("./OctokitAction");
class PullRequestAction extends OctokitAction_1.OctokitAction {
    async execute() {
        const issueIds = await this.fixedJiraIssues();
        if (issueIds.length === 0) {
            console.log('No Jira issue found in the PR title.');
        }
        else {
            for (const issueId of issueIds) {
                // BUILD/PREQ tickets are processed only when they are from Engineering Experience Squad repos. They should be ignored in any other repo, not to interfere with their process.
                if ((issueId.startsWith('BUILD-') || issueId.startsWith('PREQ-')) && !this.isEngXpSquad) {
                    this.log(`Skipping ${issueId}`);
                }
                else {
                    await this.processJiraIssue(issueId);
                }
            }
        }
    }
    async fixedJiraIssues() {
        const pr = await this.loadPullRequest(this.payload.pull_request.number);
        return pr
            ? (await this.findFixedIssues(pr)) ?? []
            : [];
    }
}
exports.PullRequestAction = PullRequestAction;
//# sourceMappingURL=PullRequestAction.js.map