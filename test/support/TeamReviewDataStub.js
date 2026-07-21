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
import { GitHubTeamSlugs, JiraTeams } from '../../src/helpers/TeamConfiguration.js';
import { TeamReviewData } from '../../src/helpers/TeamReviewData.js';
export class TeamReviewDataStub extends TeamReviewData {
  static createCloudEngineering(senderAccountId, assigneeAccountId) {
    return new TeamReviewData(
      true,
      senderAccountId,
      assigneeAccountId,
      JiraTeams.CloudEngineering,
      {
        name: GitHubTeamSlugs.PlatformCloudEngineering,
        slug: GitHubTeamSlugs.PlatformCloudEngineering,
      },
    );
  }
  static createEngXp(senderAccountId, assigneeAccountId) {
    return new TeamReviewData(
      false,
      senderAccountId,
      assigneeAccountId,
      JiraTeams.EngineeringExperience,
      { name: GitHubTeamSlugs.PlatformEngXp, slug: GitHubTeamSlugs.PlatformEngXp },
    );
  }
}
