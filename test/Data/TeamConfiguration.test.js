import { afterEach, before, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert';
import { JIRA_DOMAIN, JIRA_ORGANIZATION_ID, JIRA_SITE_ID } from '../../src/helpers/Constants.js';
import { JiraClient } from '../../src/helpers/JiraClient.js';
import { LogTester } from '../support/LogTester.js';
import {
  GitHubTeamSlugs,
  JiraTeams,
  RootlyScheduleIds,
  TeamConfigurationData,
} from '../../src/helpers/TeamConfiguration.js';
import { OctokitAction } from '../../src/helpers/OctokitAction.js';
let jira;
let action;
// All teams that exist in Jira, but do not create PRs and do not need boardId configured:
const ignoredTeams = [
  '1.SC_Project Mgmt.',
  '2.SCE_GTM',
  '3.Stripe_Project Mgmt.',
  'Accounts Payable',
  'Agentic Security',
  'AICoreTeam',
  'Analysis Trust', // Not using sprints
  'BizTech - FrontOffice',
  'BizTech - SolutionEnablement',
  'Brand & Communications',
  'Business Intelligence', // Not using sprints
  'Business Projects',
  'CAB Change Approvers',
  'Code Review Squad', // Not using sprints
  'CodeNext Bravo Squad',
  'CodeNextTeam', // Not using sprints
  'Communications',
  'Content',
  'Core Languages & Parsers Squad', // Not using sprints
  'Corporate Marketing',
  'Creative',
  'Customer Marketing',
  'Data & Insights',
  'Documentation Squad',
  'ELT',
  'End-User Technology',
  'Engineering Project Management',
  'Enterprise Architecture Squad',
  'EUT L1 Support',
  'EUT L2 Support',
  'EUT L3 Support',
  'Events',
  'FieldOps',
  'Finance Netsuite',
  'Finance Payroll',
  'Finance Team',
  'FP&A',
  'FP&A GTM',
  'FP&A MC&Product',
  'Front-Office Squad (Stripe)',
  'Growth',
  'Growth Marketing',
  'GTM - Web Development Squad',
  'Helix',
  'HR Business Partner',
  'HR Operations',
  'Identity Triage',
  'Incident & Problem Management',
  'InfoSec',
  'Infrastructure',
  'Internal Events',
  'IST',
  'ITOPS',
  'ITOPS-EUT',
  'ITOPS-MIM',
  'ITOPS-NETENG',
  'ITOPS-SOC',
  'ITOPS-SYSENG',
  'Legal Team',
  'Operational Finance',
  'Org Change JSM Process Owners',
  'PM Team',
  'ProdSec',
  'Product Data', // Not using sprints
  'Purchase',
  'Rule Coverage', // Not using sprints
  'SecGov',
  'Services',
  'Storefront EM',
  'Support Council',
  'Taint Analysis', // Aggregation of STL Taint and DTL Taint
  'Travel Team',
  'UX Team',
  'Vendor Management',
  'WE Alexandria',
  'WE Annecy',
  'WE Austin',
  'WE Bochum',
  'WE Geneva',
  'WE London',
  'WE Silicon Valley',
  'WE Singapore',
  'WE Sonar',
  'WE Tokyo',
];
class TestOctokitAction extends OctokitAction {
  async execute() {
    throw new Error('This is not supposed to be executed');
  }
}
before(() => {
  const jiraUser = process.env['JIRA_USER']; // Can't use the same name as environment variables read by Octokit actions, because the dash is not propagated from shell to node
  const jiraToken = process.env['JIRA_TOKEN'];
  const githubToken = process.env['GITHUB_TOKEN'];
  const rootlyToken = process.env['ROOTLY_TOKEN']; // This is available only in CI, user tokens can't be created by default
  if (jiraUser && jiraToken) {
    jira = new JiraClient(JIRA_DOMAIN, JIRA_SITE_ID, JIRA_ORGANIZATION_ID, jiraUser, jiraToken);
  } else {
    assert.fail(
      'JiraClient tests require JIRA_USER and JIRA_TOKEN environment variables to be set.',
    );
  }
  if (githubToken) {
    process.env['GITHUB_REPOSITORY'] = 'SonarSource/test-repo'; // Owner needs to be correct for findEmails to work properly
    process.env['INPUT_GITHUB-TOKEN'] = githubToken;
    process.env['INPUT_ROOTLY-TOKEN'] = rootlyToken;
    action = new TestOctokitAction();
  } else {
    assert.fail('GitHub tests require GITHUB_TOKEN environment variable to be set.');
  }
});
describe('TeamConfiguration', () => {
  let logTester;
  const itRunsOnlyInCI = process.env.GITHUB_ACTIONS === 'true' ? it : it.skip;
  beforeEach(() => {
    logTester = new LogTester();
  });
  afterEach(() => {
    logTester?.afterEach(); // When before fails, beforeEach is not called, but afterEach is.
  });
  describe('Jira', () => {
    it('EngineeringExperienceSquad is valid', async () => {
      const team = await jira.findTeamByName(JiraTeams.EngineeringExperience.name);
      assert.notStrictEqual(team, null);
      assert.strictEqual(team.id, JiraTeams.EngineeringExperience.id);
    });
    it('CloudEngineeringSquad is valid', async () => {
      const team = await jira.findTeamByName(JiraTeams.CloudEngineering.name);
      assert.notStrictEqual(team, null);
      assert.strictEqual(team.id, JiraTeams.CloudEngineering.id);
    });
    it('CloudProductionEngineeringSquad is valid', async () => {
      const team = await jira.findTeamByName(JiraTeams.CloudProductionEngineering.name);
      assert.notStrictEqual(team, null);
      assert.strictEqual(team.id, JiraTeams.CloudProductionEngineering.id);
    });
    it('teams have valid names', async () => {
      for (const teamData of TeamConfigurationData) {
        const team = await jira.findTeamByName(teamData.name);
        if (!team) {
          assert.fail(`Configured team does not exist in Jira: ${teamData.name}`);
        }
      }
    });
    it('teams have valid boardId', async () => {
      for (const team of TeamConfigurationData) {
        const board = await jira.findBoard(team.boardId);
        if (!board) {
          assert.fail(
            `Configured team ${team.name} does not have a valid boardId: ${team.boardId}`,
          );
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
      let newTeams = '';
      for (const jiraTeam of jiraTeams) {
        if (!knownTeams.has(jiraTeam.name)) {
          newTeams += `"${jiraTeam.name}",\n`;
        }
      }
      assert.ok(knownTeams.size > 0);
      assert.ok(jiraTeams.length > 0);
      if (newTeams) {
        logTester.originalLog(
          `New teams found in Jira. Add them to TeamConfigurationData or ignoredTeams:\n${newTeams}`,
        );
      }
    });
    it('boardId uses sprints', async () => {
      for (const team of TeamConfigurationData) {
        try {
          await jira.findSprintId(team.boardId); // Can fail with 400 (Bad Request): The board does not support sprints
        } catch (error) {
          assert.fail(
            `Team "${team.name}" with boardId ${team.boardId} findSprintId failed: ${error}`,
          );
        }
      }
    });
  });
  describe('GitHub', () => {
    it('GitHubTeamSlugs are valid', async () => {
      for (const slug of Object.values(GitHubTeamSlugs)) {
        try {
          await action.rest.teams.getByName({ org: 'SonarSource', team_slug: slug });
        } catch (error) {
          assert.fail(`GitHubTeamSlug '${slug}' is invalid: ${error}`);
        }
      }
    });
  });
  describe('Rootly', () => {
    itRunsOnlyInCI('RootlyScheduleIds are valid', async () => {
      for (const scheduleId of Object.values(RootlyScheduleIds)) {
        try {
          const emails = await action.findRootlyOnCallEmails(scheduleId);
          assert.ok(emails.length > 0);
        } catch (error) {
          assert.fail(`RootlyScheduleId '${scheduleId}' is invalid: ${error}`);
        }
      }
    });
  });
});
