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
export class TeamReviewData {
    accountId;
    team;
    name;
    constructor(accountId, team, name) {
        this.accountId = accountId;
        this.team = team;
        this.name = name;
    }
    static async create(requested_team, loadAccountId) {
        const team = this.selectTeam(requested_team);
        if (team) {
            return new TeamReviewData(await loadAccountId(), team, requested_team.name);
        }
        else {
            return null;
        }
    }
    static selectTeam(requested_team) {
        if (requested_team?.name === 'platform-cloud-eng-squad') {
            return CloudEngineeringSquad;
        }
        else if (requested_team?.name === 'platform-cloud-prod-eng-squad') {
            return CloudProductionEngineeringSquad;
        }
        else {
            return null;
        }
    }
}
//# sourceMappingURL=TeamReviewData.js.map