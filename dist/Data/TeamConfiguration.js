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
exports.TeamConfigurationData = exports.EngineeringExperienceSquad = void 0;
exports.EngineeringExperienceSquad = { id: "eb40f25e-3596-4541-b661-cf83e7bc4fa6", name: "Engineering Experience Squad" };
// If a new Jira issue is created for a standalone PR, it will be assigned to a sprint from a board defined by this file.
// If a new team or default board is created, this file should be updated accordingly.
exports.TeamConfigurationData = [
    { name: ".NET Squad", boardId: 1737 },
    { name: "Architecture Squad", boardId: 1561 },
    { name: "Analysis as a Service", boardId: 5313 },
    { name: "Analysis Processing Squad", boardId: 1443 },
    { name: "Billing-Squad", boardId: 1536 },
    { name: "BizTech - Back Office", boardId: 1464 },
    { name: "CFamily Squad", boardId: 173 },
    { name: "CodeNextTeam", boardId: 1902 },
    { name: "Cloud Platform", boardId: 1442 },
    { name: "Cloud Security", boardId: 1462 },
    { name: "Code Data Storage", boardId: 1610 },
    { name: "Code Generation", boardId: 1569 },
    { name: "DTL Taint", boardId: 4146 },
    { name: "Organization & Reporting Squad", boardId: 1555 },
    { name: "DBD Squad", boardId: 1638 },
    { name: exports.EngineeringExperienceSquad.name, boardId: 1551 },
    { name: "Front-End Engineering", boardId: 1444 },
    { name: "IDE Experience Squad", boardId: 1527 },
    { name: "Identity Squad", boardId: 1448 },
    { name: "Integrations Squad", boardId: 1438 },
    { name: "JVM Squad", boardId: 1671 },
    { name: "Mobile Security", boardId: 1608 },
    { name: "On-Prem squad", boardId: 1548 },
    { name: "Python / Data-ML Squad", boardId: 1572 },
    { name: "RAD Squad", boardId: 1770 },
    { name: "Security SCA", boardId: 1803 },
    { name: "SDLC Data Squad", boardId: 2034 },
    { name: "Code Review Incubator Squad", boardId: 3717 },
    { name: "STL Taint", boardId: 4179 },
    { name: "Web Squad", boardId: 1672 },
    { name: "Workflow & Standards Squad", boardId: 1550 },
];
//# sourceMappingURL=TeamConfiguration.js.map