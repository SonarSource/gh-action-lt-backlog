import { JIRA_DOMAIN, JIRA_ORGANIZATION_ID, JIRA_SITE_ID } from "../lib/Constants";
import { JiraClient } from "../lib/JiraClient";
import { LogTester } from "../tests/LogTester";
import { EngineeringExperienceSquad, TeamConfigurationData } from "./TeamConfiguration";
import { fail } from 'node:assert';
import { Team } from '../lib/Team';

let jira: JiraClient;

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
];

beforeAll(() => {
  const user = process.env["JIRA_USER"];    // Can't use the same name as environment variables read by Octokit actions, because the dash is not propagated from shell to node
  const token = process.env["JIRA_TOKEN"];
  if (user && token) {
    jira = new JiraClient(JIRA_DOMAIN, JIRA_SITE_ID, JIRA_ORGANIZATION_ID, user, token);
  } else {
    fail("JiraClient tests require JIRA_USER and JIRA_TOKEN environment variables to be set.");
  }
});

describe('TeamConfiguration', () => {
  let logTester: LogTester;

  beforeEach(() => {
    logTester = new LogTester();
  });

  afterEach(() => {
    logTester.afterEach();
  });

  it('EngineeringExperienceSquad is valid', async () => {
    const team = await jira.findTeamByName(EngineeringExperienceSquad.name);
    expect(team).not.toBeNull();
    expect(team.id).toBe(EngineeringExperienceSquad.id);
  });

  it('teams have valid names', async () => {
    expect(TeamConfigurationData.length).toBeGreaterThan(0);  // Having at least one assertion prevents logTester from dumping console logs
    for (const teamData of TeamConfigurationData) {
      const team = await jira.findTeamByName(teamData.name);
      if (!team) {
        fail(`Configured team does not exist in Jira: ${teamData.name}`);
      }
    }
  }, 20000);  // 20s timeout

  it('teams have valid boardId', async () => {
    expect(TeamConfigurationData.length).toBeGreaterThan(0);  // Having at least one assertion prevents logTester from dumping console logs
    for (const team of TeamConfigurationData) {
      const board = await jira.findBoard(team.boardId);
      if (!board) {
        fail(`Configured team ${team.name} does not have a valid boardId: ${team.boardId}`);
      }
    }
  }, 20000);  // 20s timeout

  it('teams have valid boardId', async () => {
    const knownTeams: Set<string> = new Set();
    for (const team of TeamConfigurationData) {
      knownTeams.add(team.name);
    }
    for (const team of ignoredTeams) {
      knownTeams.add(team);
    }
    const jiraTeams: Team[] = await (jira as any).findTeams('');
    jiraTeams.sort((a, b) => a.name.localeCompare(b.name));
    let newTeams: string = "";
    for (const jiraTeam of jiraTeams) {
      if (!knownTeams.has(jiraTeam.name)) {
        newTeams += `"${jiraTeam.name}",\n`;
      }
    }
    expect(knownTeams.size).toBeGreaterThan(0);  // Having at least one assertion prevents logTester from dumping console logs
    expect(jiraTeams.length).toBeGreaterThan(0);
    if (newTeams) {
      fail(`New teams found in Jira. Add them to TeamConfigurationData or ignoredTeams:\n${newTeams}`);
    }
  });
});
