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
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { JIRA_DOMAIN, JIRA_ORGANIZATION_ID, JIRA_SITE_ID } from "../lib/Constants.js";
import { JiraClient } from "../lib/JiraClient.js";
import { LogTester } from "../tests/LogTester.js";
import { CloudEngineeringSquad, CloudProductionEngineeringSquad, EngineeringExperienceSquad, GitHubTeamSlugs, TeamConfigurationData } from "./TeamConfiguration.js";
import { fail } from 'node:assert';
import { getOctokit } from '@actions/github';
let jira;
let octokit;
vi.setConfig({ testTimeout: 20000 }); // 20s
// All teams that exist in Jira, but do not create PRs and do not need boardId configured:
const ignoredTeams = [
    ".NET Squad", // Not using sprints
    "1.SC_Project Mgmt.",
    "2.SCE_GTM",
    "3.Stripe_Project Mgmt.",
    "Accounts Payable",
    "Agentic Security",
    "AICoreTeam",
    "BizTech - FrontOffice",
    "BizTech - SolutionEnablement",
    "Business Intelligence", // Not using sprints
    "Business Projects",
    "CAB Change Approvers",
    "Code Review Squad", // Not using sprints
    "CodeNext Bravo Squad",
    "CodeNextTeam", // Not using sprints
    "Customer Marketing",
    "Data & Insights",
    "Documentation Squad",
    "ELT",
    "End-User Technology",
    "Engineering Project Management",
    "Enterprise Architecture Squad",
    "EUT L1 Support",
    "EUT L2 Support",
    "EUT L3 Support",
    "Events",
    "FieldOps",
    "Finance Netsuite",
    "Finance Payroll",
    "Finance Team",
    "FP&A",
    "FP&A GTM",
    "FP&A MC&Product",
    "Front-Office Squad (Stripe)",
    "Growth",
    "Growth Marketing",
    "GTM - Web Development Squad",
    "Helix",
    "HR Business Partner",
    "HR Operations",
    "Identity Triage",
    "Incident & Problem Management",
    "InfoSec",
    "Infrastructure",
    "Internal Events",
    "IST",
    "ITOPS",
    "ITOPS-EUT",
    "ITOPS-MIM",
    "ITOPS-NETENG",
    "ITOPS-SOC",
    "ITOPS-SYSENG",
    "Legal Team",
    "Operational Finance",
    "PM Team",
    "ProdSec",
    "Product Data", // Not using sprints
    "Purchase",
    "SecGov",
    "Services",
    "Storefront EM",
    "Support Council",
    "Taint Analysis", // Aggregation of STL Taint and DTL Taint
    "Travel Team",
    "UX Team",
    "Vendor Management",
    "WE Alexandria",
    "WE Annecy",
    "WE Austin",
    "WE Bochum",
    "WE Geneva",
    "WE London",
    "WE Silicon Valley",
    "WE Singapore",
    "WE Sonar",
    "WE Tokyo",
];
beforeAll(() => {
    const jiraUser = process.env["JIRA_USER"]; // Can't use the same name as environment variables read by Octokit actions, because the dash is not propagated from shell to node
    const jiraToken = process.env["JIRA_TOKEN"];
    const githubToken = process.env["GITHUB_TOKEN"];
    if (jiraUser && jiraToken) {
        jira = new JiraClient(JIRA_DOMAIN, JIRA_SITE_ID, JIRA_ORGANIZATION_ID, jiraUser, jiraToken);
    }
    else {
        fail('JiraClient tests require JIRA_USER and JIRA_TOKEN environment variables to be set.');
    }
    if (githubToken) {
        octokit = getOctokit(githubToken);
    }
    else {
        fail('GitHub tests require GITHUB_TOKEN environment variable to be set.');
    }
});
describe('TeamConfiguration', () => {
    let logTester;
    beforeEach(() => {
        logTester = new LogTester(false);
    });
    afterEach(() => {
        logTester?.afterEach(); // When beforeAll fails, beforeEach is not called, but afterEach is.
    });
    it('EngineeringExperienceSquad is valid', async () => {
        const team = await jira.findTeamByName(EngineeringExperienceSquad.name);
        expect(team).not.toBeNull();
        expect(team.id).toBe(EngineeringExperienceSquad.id);
    });
    it('CloudEngineeringSquad is valid', async () => {
        const team = await jira.findTeamByName(CloudEngineeringSquad.name);
        expect(team).not.toBeNull();
        expect(team.id).toBe(CloudEngineeringSquad.id);
    });
    it('CloudProductionEngineeringSquad is valid', async () => {
        const team = await jira.findTeamByName(CloudProductionEngineeringSquad.name);
        expect(team).not.toBeNull();
        expect(team.id).toBe(CloudProductionEngineeringSquad.id);
    });
    it('teams have valid names', async () => {
        for (const teamData of TeamConfigurationData) {
            const team = await jira.findTeamByName(teamData.name);
            if (!team) {
                fail(`Configured team does not exist in Jira: ${teamData.name}`);
            }
        }
    });
    it('teams have valid boardId', async () => {
        for (const team of TeamConfigurationData) {
            const board = await jira.findBoard(team.boardId);
            if (!board) {
                fail(`Configured team ${team.name} does not have a valid boardId: ${team.boardId}`);
            }
        }
    });
    it('list new teams', async () => {
        const knownTeams = new Set();
        for (const team of TeamConfigurationData) {
            knownTeams.add(team.name);
        }
        for (const team of ignoredTeams) {
            knownTeams.add(team);
        }
        const jiraTeams = await jira.findTeams('');
        jiraTeams.sort((a, b) => a.name.localeCompare(b.name));
        let newTeams = "";
        for (const jiraTeam of jiraTeams) {
            if (!knownTeams.has(jiraTeam.name)) {
                newTeams += `"${jiraTeam.name}",\n`;
            }
        }
        expect(knownTeams.size).toBeGreaterThan(0);
        expect(jiraTeams.length).toBeGreaterThan(0);
        if (newTeams) {
            logTester.originalLog(`New teams found in Jira. Add them to TeamConfigurationData or ignoredTeams:\n${newTeams}`);
        }
    });
    it('boardId uses sprints', async () => {
        for (const team of TeamConfigurationData) {
            try {
                await jira.findSprintId(team.boardId); // Can fail with 400 (Bad Request): The board does not support sprints
            }
            catch (error) {
                fail(`Team "${team.name}" with boardId ${team.boardId} findSprintId failed: ${error}`);
            }
        }
    });
    it('GitHubTeamSlugs are valid', async () => {
        for (const slug of Object.values(GitHubTeamSlugs)) {
            try {
                await octokit.rest.teams.getByName({ org: 'SonarSource', team_slug: slug });
            }
            catch (error) {
                fail(`GitHubTeamSlug '${slug}' is invalid: ${error}`);
            }
        }
    });
});
//# sourceMappingURL=TeamConfiguration.test.js.map