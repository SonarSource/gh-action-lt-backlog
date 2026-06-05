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

import { GitHubTeamSlugs, JiraTeams } from "../Data/TeamConfiguration.js";
import { SimpleTeam } from "../lib/OctokitTypes.js";
import { TeamReviewData } from "../lib/TeamReviewData.js";

export class TeamReviewDataStub extends TeamReviewData {
  public static createCloudEngineering(senderAccountId: string | null, assigneeAccountId: string | null): TeamReviewData {
    return new TeamReviewData(true, senderAccountId, assigneeAccountId, JiraTeams.CloudEngineering, { name: GitHubTeamSlugs.PlatformCloudEngineering, slug: GitHubTeamSlugs.PlatformCloudEngineering } as SimpleTeam);
  }

  public static createEngXp(senderAccountId: string | null, assigneeAccountId: string | null): TeamReviewData {
    return new TeamReviewData(false, senderAccountId, assigneeAccountId, JiraTeams.EngineeringExperience, { name: GitHubTeamSlugs.PlatformEngXp, slug: GitHubTeamSlugs.PlatformEngXp } as SimpleTeam);
  }
}
