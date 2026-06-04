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
import { JiraTeams, GitHubTeamSlugs, RootlyScheduleIds } from "../Data/TeamConfiguration.js";
export class TeamReviewData {
    senderAccountId;
    assigneeAccountId;
    jiraTeam;
    gitHubTeam;
    constructor(senderAccountId, assigneeAccountId, team, gitHubTeam) {
        this.senderAccountId = senderAccountId;
        this.assigneeAccountId = assigneeAccountId;
        this.jiraTeam = team;
        this.gitHubTeam = gitHubTeam;
    }
    static async create(action, requested_team) {
        const candidate = this.selectTeam(requested_team);
        if (candidate && await this.senderIsFromOutsideTeam(action, candidate)) {
            const assigneeAccountId = await action.jira.findAccountId(await action.findRootlyOnCallEmails(candidate.rootlyScheduleId));
            return new TeamReviewData(await action.loadSenderAccountId(), assigneeAccountId, candidate.jiraTeam, requested_team);
        }
        else {
            return null;
        }
    }
    static selectTeam(requested_team) {
        if (requested_team?.slug === GitHubTeamSlugs.PlatformCloudEngineering) {
            return {
                jiraTeam: JiraTeams.CloudEngineering,
                rootlyScheduleId: RootlyScheduleIds.PlatformCloudEngineering,
                ignoredGitHubTeamSlugs: [GitHubTeamSlugs.PlatformCloudEngineering, GitHubTeamSlugs.PlatformCloudProductionEngineering]
            };
        }
        else if (requested_team?.slug === GitHubTeamSlugs.PlatformCloudProductionEngineering) {
            return {
                jiraTeam: JiraTeams.CloudProductionEngineering,
                rootlyScheduleId: RootlyScheduleIds.PlatformCloudProductionEngineering,
                ignoredGitHubTeamSlugs: [GitHubTeamSlugs.PlatformCloudEngineering, GitHubTeamSlugs.PlatformCloudProductionEngineering]
            };
        }
        else {
            return null;
        }
    }
    static async senderIsFromOutsideTeam(action, candidate) {
        for (const slug of candidate.ignoredGitHubTeamSlugs) {
            const members = await action.listTeamMembers(slug);
            if (members.some(x => x.login === action.payload.sender?.login)) {
                return false;
            }
        }
        return true;
    }
}
//# sourceMappingURL=TeamReviewData.js.map