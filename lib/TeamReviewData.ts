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

import { CloudEngineeringSquad, CloudProductionEngineeringSquad, GitHubTeamSlugs } from "../Data/TeamConfiguration.js";
import type { OctokitAction } from "./OctokitAction.js";
import { SimpleTeam } from "./OctokitTypes.js";
import { Team } from "./Team.js";

type TeamCandidate = {
  jiraTeam: Team;
  ignoredGitHubTeamSlugs: string[];
};

export class TeamReviewData {
  public readonly accountId: string | null;
  public readonly team: Team;
  public readonly name: string;

  protected constructor(accountId: string | null, team: Team, name: string) {
    this.accountId = accountId;
    this.team = team;
    this.name = name;
  }

  public static async create(action: OctokitAction, requested_team: SimpleTeam | null): Promise<TeamReviewData | null> {
    const candidate = this.selectTeam(requested_team);
    if (candidate && await this.senderIsFromOutsideTeam(action, candidate)) {
      return new TeamReviewData(await action.loadSenderAccountId(), candidate.jiraTeam, requested_team!.name);
    } else {
      return null;
    }
  }

  private static selectTeam(requested_team: SimpleTeam | undefined | null): TeamCandidate | null {
    if (requested_team?.slug === GitHubTeamSlugs.PlatformCloudEngineering) {
      return {
        jiraTeam: CloudEngineeringSquad,
        ignoredGitHubTeamSlugs: [GitHubTeamSlugs.PlatformCloudEngineering, GitHubTeamSlugs.PlatformCloudProductionEngineering]
      };
    } else if (requested_team?.slug === GitHubTeamSlugs.PlatformCloudProductionEngineering) {
      return {
        jiraTeam: CloudProductionEngineeringSquad,
        ignoredGitHubTeamSlugs: [GitHubTeamSlugs.PlatformCloudEngineering, GitHubTeamSlugs.PlatformCloudProductionEngineering]
      }
    } else {
      return null;
    }
  }

  private static async senderIsFromOutsideTeam(action: OctokitAction, candidate: TeamCandidate): Promise<boolean> {
    for (const slug of candidate.ignoredGitHubTeamSlugs) {
      const members = await action.listTeamMembers(slug);
      if (members.some(x => x.login === action.payload.sender?.login)) {
        return false;
      }
    }
    return true;
  }
}
