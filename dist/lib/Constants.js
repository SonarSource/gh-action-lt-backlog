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
exports.JIRA_ORGANIZATION_ID = exports.JIRA_SITE_ID = exports.JIRA_DOMAIN = exports.JIRA_ISSUE_PATTERN = exports.RENOVATE_PREFIX = void 0;
exports.RENOVATE_PREFIX = 'Renovate Jira issue ID: '; // Workaround for https://github.com/renovatebot/renovate/issues/26833
exports.JIRA_ISSUE_PATTERN = /[A-Z][A-Z0-9]*-\d+/g;
exports.JIRA_DOMAIN = 'https://sonarsource-sandbox-608.atlassian.net'; // FIXME: Debug value on a Dev branch. This should NOT make it to a PR nor master
// To find values for these constants, you can use the following query, update Jira domain, and post it here: https://developer.atlassian.com/platform/teams/graphql/explorer/
// To avoid consistency of having a single name for the same thing everywhere, wise developers of Patlassian* named the redundant `siteId` form teamSearchV2 a `cloudId` here.
// * https://en.wikipedia.org/wiki/Pat_%26_Mat#Names
// query MandatoryButUselessQueryName { tenantContexts ( hostNames: [ "sonarsource.atlassian.net" ] ) { cloudId orgId } }
exports.JIRA_SITE_ID = '5ea71b8c-f3d5-4b61-b038-001c50df1666'; // FIXME: Debug value on a Dev branch for sandbox. This should NOT make it to a PR nor master
exports.JIRA_ORGANIZATION_ID = '78eed3e4-84ad-4374-b777-a3b4ba5d9516';
//# sourceMappingURL=Constants.js.map