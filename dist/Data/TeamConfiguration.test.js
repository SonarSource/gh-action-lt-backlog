"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Constants_1 = require("../lib/Constants");
const JiraClient_1 = require("../lib/JiraClient");
const LogTester_1 = require("../tests/LogTester");
const TeamConfiguration_1 = require("./TeamConfiguration");
const node_assert_1 = require("node:assert");
let jira;
// All teams that exist in Jira, but do not create PRs and do not need boardId configured:
const ignoredTeams = [
    "1.SC_Project Mgmt.",
    "2.SCE_GTM",
    "3.Stripe_Project Mgmt.",
    "AICoreTeam",
    "BizTech - FrontOffice",
    "BizTech - SolutionEnablement",
    "Business Projects",
    "Cloud ARB",
    "CodeNext Bravo Squad",
    "Core Squad",
    "Customer Marketing",
    "Customer Onboarding Squad",
    "Customer Success",
    "DevRel",
    "Documentation Squad",
    "EA",
    "EA EMEA",
    "Enablement ⛴️ 🤿",
    "End-User Technology",
    "Engineering Project Management",
    "Enterprise Acquisition - North America ",
    "Events",
    "FieldOps",
    "Finance Team",
    "Front-Office Squad (Stripe)",
    "Growth & New Ventures",
    "Growth Marketing",
    "GTM - Web Development Squad",
    "Incident & Problem Management",
    "InfoSec",
    "Infrastructure",
    "IST",
    "IST-PST",
    "IST-SECGOV",
    "ITOPS-EUT",
    "ITOPS-ISE",
    "ITOPS-SM",
    "ManishKTest",
    "Marketing",
    "Nice LTS shirt :)",
    "PLG squad",
    "PM Team",
    "ProdSec",
    "Purchase",
    "Renewals Team",
    "RIS Squad",
    "Services",
    "Storefront EM",
    "Support Council",
    "Support Team",
    "Support Team Jira Admins",
    "Support-test",
    "Team Ramrod",
    "Technology Alliances Program",
    "UX Team",
    "Vendor Management",
    "WE Alexandria",
    "WE Annecy",
    "WE Austin",
    "WE Bochum",
    "WE Geneva",
    "WE London",
    "WE Singapore",
    "WE Tokyo",
];
beforeAll(() => {
    const user = process.env["JIRA_USER"]; // Can't use the same name as environment variables read by Octokit actions, because the dash is not propagated from shell to node
    const token = process.env["JIRA_TOKEN"];
    if (user && token) {
        jira = new JiraClient_1.JiraClient(Constants_1.JIRA_DOMAIN, Constants_1.JIRA_SITE_ID, Constants_1.JIRA_ORGANIZATION_ID, user, token);
    }
    else {
        (0, node_assert_1.fail)("JiraClient tests require JIRA_USER and JIRA_TOKEN environment variables to be set.");
    }
});
describe('TeamConfiguration', () => {
    let logTester;
    beforeEach(() => {
        logTester = new LogTester_1.LogTester();
    });
    afterEach(() => {
        logTester.afterEach();
    });
    it('EngineeringExperienceSquad is valid', async () => {
        const team = await jira.findTeamByName(TeamConfiguration_1.EngineeringExperienceSquad.name);
        expect(team).not.toBeNull();
        expect(team.id).toBe(TeamConfiguration_1.EngineeringExperienceSquad.id);
    });
    it('teams have valid names', async () => {
        expect(TeamConfiguration_1.TeamConfigurationData.length).toBeGreaterThan(0); // Having at least one assertion prevents logTester from dumping console logs
        for (const teamData of TeamConfiguration_1.TeamConfigurationData) {
            const team = await jira.findTeamByName(teamData.name);
            if (!team) {
                (0, node_assert_1.fail)(`Configured team does not exist in Jira: ${teamData.name}`);
            }
        }
    }, 20000); // 20s timeout
    it('teams have valid boardId', async () => {
        expect(TeamConfiguration_1.TeamConfigurationData.length).toBeGreaterThan(0); // Having at least one assertion prevents logTester from dumping console logs
        for (const team of TeamConfiguration_1.TeamConfigurationData) {
            const board = await jira.findBoard(team.boardId);
            if (!board) {
                (0, node_assert_1.fail)(`Configured team ${team.name} does not have a valid boardId: ${team.boardId}`);
            }
        }
    }, 20000); // 20s timeout
    it('teams have valid boardId', async () => {
        const knownTeams = new Set();
        for (const team of TeamConfiguration_1.TeamConfigurationData) {
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
        expect(knownTeams.size).toBeGreaterThan(0); // Having at least one assertion prevents logTester from dumping console logs
        expect(jiraTeams.length).toBeGreaterThan(0);
        if (newTeams) {
            (0, node_assert_1.fail)(`New teams found in Jira. Add them to TeamConfigurationData or ignoredTeams:\n${newTeams}`);
        }
    });
});
//# sourceMappingURL=TeamConfiguration.test.js.map