import { EngineeringExperienceSquad } from "../Data/TeamConfiguration";
import { JiraClient } from '../lib/JiraClient';
import { Team } from '../lib/Team';

export const jiraClientStub = {
  async loadIssue(issueId: string): Promise<any> {
    switch (issueId) {
      case 'MMF-1111': return { key: 'MMF-1111', fields: { project: { key: 'MMF' }, issuetype: { name: 'Epic' } } };
      case 'KEY-1111': return { key: 'KEY-1111', fields: { project: { key: 'KEY' }, issuetype: { name: 'Epic' } } };
      case 'KEY-1234': return { key: 'KEY-1234', fields: { project: { key: 'KEY' }, issuetype: { name: 'Task' } } };
      case 'KEY-5555': return { key: 'KEY-5555', fields: { project: { key: 'KEY' }, issuetype: { name: 'Sub-task' } } };
      default: throw new Error(`Scaffolding did not expect ${issueId}`);
    }
  },
  async loadProject(projectKey: string): Promise<any> {
    return projectKey === 'KEY'
      ? { lead: { accountId: '1234-account', displayName: 'Project Lead' } }
      : { lead: { accountId: '2222-no-team', displayName: 'Project Lead Without team' } };
  },
  async findAccountId(email: string): Promise<string> {
    switch (email) {
      case 'user@sonarsource.com': return '1234-account';
      case 'eng.exp@sonarsource.com': return '3333-eng-exp-account';
      case 'renovate@renovate.com': return null;
      case 'dependabot@dependabot.com': return null;
      default: throw new Error(`Scaffolding did not expect email ${email}`);
    }
  },
  async findTeamByUser(accountId: string): Promise<Team> {
    switch (accountId) {
      case '1234-account': return { name: '.NET Squad', id: 'dot-neeet-team' };
      case '2222-no-team': return null;
      case '3333-eng-exp-account': return EngineeringExperienceSquad;
      default: throw new Error(`Scaffolding did not expect accountId ${accountId}`);
    };
  },
  async findTeamByName(accountId: string): Promise<Team> {
    switch (accountId) {
      case 'fallback-team': return { name: 'Analysis Processing Squad', id: 'fallback-team' };
      case 'nonexistent-fallback-team': return null;
      default: throw new Error(`Scaffolding did not expect team name ${accountId}`);
    }
  },
  async findSprintId(boardId: number): Promise<number> {
    return 42;
  }
} as unknown as JiraClient;
