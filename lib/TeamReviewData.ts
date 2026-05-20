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

import { CloudEngineeringSquad, CloudProductionEngineeringSquad } from "../Data/TeamConfiguration.js";
import { JiraClient } from "./JiraClient.js";
import { SimpleTeam } from "./OctokitTypes.js";
import { Team } from "./Team.js";

export class TeamReviewData {
  public readonly accountId: string | null;
  public readonly team: Team;

  private constructor(accountId: string | null, team: Team) {
    this.accountId = accountId;
    this.team = team;
  }

  public static createFromAccount(requested_team: SimpleTeam | undefined, accountId: string | null): TeamReviewData | null {
    const team = this.selectTeam(requested_team);
    if (team) {
      return new TeamReviewData(accountId, team);
    } else {
      return null;
    }
  }

  public static async createFromUser(jira: JiraClient, requested_team: SimpleTeam | null, login: string, findEmails: (login: string) => Promise<string[]>): Promise<TeamReviewData | null> {
    const team = this.selectTeam(requested_team);
    if (team) {
      const userEmails = await findEmails(login);
      const accountId = await jira.findAccountId(userEmails);
      return new TeamReviewData(accountId, team);
    } else {
      return null;
    }
  }

  private static selectTeam(requested_team: SimpleTeam | undefined | null): Team | null {
    if (requested_team?.name === 'platform-cloud-eng-squad') {
      return CloudEngineeringSquad;
    } else if (requested_team?.name === 'platform-cloud-prod-eng-squad') {
      return CloudProductionEngineeringSquad;
    } else {
      return null;
    }
  }
}
