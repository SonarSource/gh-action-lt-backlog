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
;
export const GitHubTeamSlugs = {
    PlatformCloudEngineering: 'platform-cloud-eng-squad',
    PlatformCloudProductionEngineering: 'platform-cloud-prod-eng-squad',
    PlatformEngXp: 'platform-eng-xp-squad',
    PlatformFrontEndEngineering: 'platform-front-end-eng-squad',
};
export const JiraTeams = {
    EngineeringExperience: { id: 'eb40f25e-3596-4541-b661-cf83e7bc4fa6', name: 'Engineering Experience Squad' },
    CloudEngineering: { id: '772ea1dc-3574-42bc-a378-7a898d910ebd', name: 'Cloud Engineering' },
    CloudProductionEngineering: { id: '6f2e744b-9f09-4c3a-852e-e2f138d1c14f', name: 'Cloud Production Engineering' },
    FrontEndEngineering: { id: '53da4327-9401-498d-ae38-28dcb1e347a1', name: 'Front-End Engineering' },
};
export const RootlyScheduleIds = {
    PlatformCloudEngineeringTriager: 'a8f6f785-aea9-4647-8200-f249dfd5fa70',
    PlatformCloudProductionEngineeringTriager: '70205800-ac28-48cd-a45e-b2e56f01edc9',
    PlatformEngXpTriager: '340d3bc8-9b6c-43fc-856a-e44bec97ebc8',
    PlatformFrontEndEngineeringTriager: '2091132b-a81b-4c6c-80ea-8d4ea74227af',
};
// If a new Jira issue is created for a standalone PR, it will be assigned to a sprint from a board defined by this file.
// If a new team or default board is created, this file should be updated accordingly.
export const TeamConfigurationData = [
    { name: "Architecture Squad", boardId: 1561 },
    { name: "Analysis as a Service", boardId: 5313 },
    { name: "Analysis Processing Squad", boardId: 1443 },
    { name: "Autoscan", boardId: 9544 },
    { name: "Billing-Squad", boardId: 1536 },
    { name: "BizTech - Back Office", boardId: 1464 },
    { name: "CAG Squad", boardId: 8314 },
    { name: "CI Experience", boardId: 9378 },
    { name: JiraTeams.CloudEngineering.name, boardId: 8147 },
    { name: JiraTeams.CloudProductionEngineering.name, boardId: 8148 },
    { name: "Cloud Security", boardId: 1462 },
    { name: "Code Data Storage", boardId: 9013 },
    { name: "Remediation Experience", boardId: 1569 },
    { name: "Data & ML Platform", boardId: 7875 },
    { name: "DTL Taint", boardId: 4146 },
    { name: "Organization & Reporting Squad", boardId: 1555 },
    { name: "ABD Squad", boardId: 1638 },
    { name: "Development Experience Squad", boardId: 1527 },
    { name: JiraTeams.EngineeringExperience.name, boardId: 1551 },
    { name: JiraTeams.FrontEndEngineering.name, boardId: 1444 },
    { name: "Identity Squad", boardId: 1448 },
    { name: "DOPex Squad", boardId: 1438 },
    { name: "Server Platform squad", boardId: 1548 },
    { name: "Language Coverage Squad", boardId: 1770 },
    { name: "Security SCA", boardId: 1803 },
    { name: "STL Taint", boardId: 4179 },
    { name: "Workflow & Standards Squad", boardId: 1550 },
];
//# sourceMappingURL=TeamConfiguration.js.map