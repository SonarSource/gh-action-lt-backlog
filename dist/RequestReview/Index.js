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
// import { RequestReview } from "./RequestReview.js";
// const action = new RequestReview();
// action.run();
// import { JIRA_DOMAIN, JIRA_ORGANIZATION_ID, JIRA_SITE_ID } from "../lib/Constants.js";
// import { JiraClient } from "../lib/JiraClient.js";
// console.log(`${JIRA_DOMAIN}, ${JIRA_SITE_ID}, ${JIRA_ORGANIZATION_ID}`);
// console.log('Identical');
// //const jira = new JiraClient(JIRA_DOMAIN, JIRA_SITE_ID, JIRA_ORGANIZATION_ID, process.env['INPUT_JIRA-USER'] || '', process.env['INPUT_JIRA-TOKEN'] || '');
// (async () => {
//   // const myself = await jira.myself();
//   // console.log(JSON.stringify(myself, undefined, 2));
//   const name = 'platform-cloud-eng-squad';
//   console.log(`Done:`);
// })();
import { OctokitAction } from '../lib/OctokitAction.js';
class DebugAction extends OctokitAction {
    async execute() {
        const team = {
            "description": "",
            "html_url": "https://github.com/orgs/SonarSource/teams/quality-dotnet-squad",
            "id": 17245565,
            "members_url": "https://api.github.com/organizations/545988/team/17245565/members{/member}",
            "name": "quality-dotnet-squad",
            "node_id": "T_kwDOAAhUxM4BByV9",
            "notification_setting": "notifications_enabled",
            "organization_id": 545988,
            "permission": "pull",
            "privacy": "closed",
            "repositories_url": "https://api.github.com/organizations/545988/team/17245565/repos",
            "slug": "quality-dotnet-squad",
            "type": "organization",
            "url": "https://api.github.com/organizations/545988/team/17245565"
        };
        // FIXME: List all team member IDs
        const result = await this.rest.teams.listMembersInOrg({
            org: this.repo.owner,
            team_slug: team.slug
        });
        this.logSerialized(result.data);
    }
}
const action = new DebugAction();
action.run();
//# sourceMappingURL=Index.js.map