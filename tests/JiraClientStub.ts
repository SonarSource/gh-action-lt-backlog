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

import { EngineeringExperienceSquad } from "../Data/TeamConfiguration";
import { JiraClient, Issue } from '../lib/JiraClient';
import { Team } from '../lib/Team';

export const jiraClientStub = {
  async loadIssue(issueId: string): Promise<any> {
    switch (issueId) {
      case 'MMF-1111': return { key: 'MMF-1111', fields: { project: { key: 'MMF' }, issuetype: { name: 'Epic' } } };
      case 'KEY-1111': return { key: 'KEY-1111', fields: { project: { key: 'KEY' }, issuetype: { name: 'Epic' } } };
      case 'KEY-1234': return { key: 'KEY-1234', fields: { project: { key: 'KEY' }, issuetype: { name: 'Maintenance' }, creator: { displayName: "Creator of KEY-1234" } } };
      case 'KEY-5678': return { key: 'KEY-5678', fields: { project: { key: 'KEY' }, issuetype: { name: 'Maintenance' }, creator: { displayName: "Jira Tech User GitHub" } } };
      case 'KEY-5555': return { key: 'KEY-5555', fields: { project: { key: 'KEY' }, issuetype: { name: 'Sub-task' } } };
      case 'FAKE-1234': return null;
      default: throw new Error(`Scaffolding did not expect ${issueId}`);
    }
  },
  async loadProject(projectKey: string): Promise<any> {
    return projectKey === 'KEY'
      ? { lead: { accountId: '1234-account', displayName: 'Project Lead' } }
      : { lead: { accountId: '2222-no-team', displayName: 'Project Lead Without team' } };
  },
  async findAccountId(email: string): Promise<string | null> {
    switch (email) {
      case 'user@sonarsource.com': return '1234-account';
      case 'eng.exp@sonarsource.com': return '3333-eng-exp-account';
      case 'team.without.evergreen.epics@sonarsource.com': return '4444-no-epics-account';
      case 'renovate@renovate.com': return null;
      case 'dependabot@dependabot.com': return null;
      default: throw new Error(`Scaffolding did not expect email ${email}`);
    }
  },
  async findTeamByUser(accountId: string): Promise<Team | null> {
    switch (accountId) {
      case '1234-account': return { name: '.NET Squad', id: 'dot-neeet-team' };
      case '2222-no-team': return null;
      case '3333-eng-exp-account': return EngineeringExperienceSquad;
      case '4444-no-epics-account': return { name: 'No Epics Squad', id: 'no-epics-team' };
      default: throw new Error(`Scaffolding did not expect accountId ${accountId}`);
    };
  },
  async findTeamByName(accountId: string): Promise<Team | null> {
    switch (accountId) {
      case 'fallback-team': return { name: 'Analysis Processing Squad', id: 'fallback-team' };
      case 'nonexistent-fallback-team': return null;
      default: throw new Error(`Scaffolding did not expect team name ${accountId}`);
    }
  },
  async findTransition(issueId: string, transitionName: string): Promise<{ id: string, name: string } | null> {
    switch (transitionName) {
      case 'Merge into master': return issueId === "KEY-1111" ? null : { id: '10000', name: transitionName };
      case 'Merge into branch': return issueId === "KEY-1111" ? null : { id: '10001', name: transitionName };
      case 'Merge': return { id: '10002', name: transitionName };
      default: return null; // No transition found
    }
  },
  async findSprintId(boardId: number): Promise<number | null> {
    return 42;
  },
  async findIssues(jql: string): Promise<Issue[]> {
    switch (jql) {
      case 'issuetype = Epic AND statusCategory != Done AND (summary ~ "KTLO" OR summary ~ "Evergreen") and "Start date[Date]"<=startOfDay() and duedate>=startOfDay() and "Team[Team]"=dot-neeet-team ORDER BY key':
        return [
          { key: 'NET-1000', fields: { summary: '.NET KTLO Epic' } } as Issue,
          { key: 'NET-0000', fields: { summary: 'Duplicate epic from same period that should not be used' } } as Issue];
      case 'issuetype = Epic AND statusCategory != Done AND (summary ~ "KTLO" OR summary ~ "Evergreen") and "Start date[Date]"<=startOfDay() and duedate>=startOfDay() and "Team[Team]"=fallback-team ORDER BY key':
        return [];
      case 'issuetype = Epic AND statusCategory != Done AND (summary ~ "KTLO" OR summary ~ "Evergreen") and "Start date[Date]"<=startOfDay() and duedate>=startOfDay() and "Team[Team]"=no-epics-team ORDER BY key':
        return [];
      case 'issuetype = Epic AND statusCategory != Done AND (summary ~ "KTLO" OR summary ~ "Evergreen") and "Start date[Date]"<=startOfDay() and duedate>=startOfDay() and "Team[Team]"=eb40f25e-3596-4541-b661-cf83e7bc4fa6 ORDER BY key':
        return [{ key: 'BUILD-1000', fields: { summary: 'Eng Exp KTLO Epic' } } as Issue];
      default:
        throw new Error(`Scaffolding did not expect JQL: ${jql}`);
    }
  },
  async createIssue(projectKey: string, summary: string, additionalFields: any): Promise<string> {
    console.log(`Invoked jira.createIssue('${projectKey}', '${summary}', ${JSON.stringify(additionalFields)})`);
    return `${projectKey}-4242`;
  },
  async addIssueRemoteLink(issueId: string, url: string, title: string | null = null): Promise<void> {
    title = title ? `'${title}'` : 'null';
    console.log(`Invoked jira.addIssueRemoteLink('${issueId}'', '${url}', ${title})`);
  },
  async moveIssue(issueId: string, transitionName: string, fields: any = null): Promise<void> {
    fields = fields ? JSON.stringify(fields) : 'null';
    console.log(`Invoked jira.moveIssue('${issueId}', '${transitionName}', ${fields})`);
  },
  async transitionIssue(issueId: string, transition: any, fields: any = null): Promise<void> {
    console.log(`Invoked jira.transitionIssue('${issueId}', ${JSON.stringify(transition)}, ${JSON.stringify(fields)})`);
  },
  async assignIssueToAccount(issueId: string, accountId: string): Promise<void> {
    console.log(`Invoked jira.assignIssueToAccount('${issueId}', '${accountId}')`);
  },
  async assignIssueToEmail(issueId: string, userEmail: string): Promise<void> {
    console.log(`Invoked jira.assignIssueToEmail('${issueId}', '${userEmail}')`);
  },
  async createComponent(projectKey: string, name: string, description: string): Promise<boolean> {
    console.log(`Invoked jira.createComponent('${projectKey}', '${name}', '${description}')`);
    return true;
  },
  async addIssueComponent(issueId: string, name: string): Promise<boolean> {
    console.log(`Invoked jira.addIssueComponent('${issueId}', '${name}')`);
    return true;
  },
  async addReviewer(issueId: string, userEmail: string): Promise<void> {
    console.log(`Invoked jira.addReviewer('${issueId}', '${userEmail}')`);
  },
  async addReviewedBy(issueId: string, userEmail: string): Promise<void> {
    console.log(`Invoked jira.addReviewedBy('${issueId}', '${userEmail}')`);
  }
} as unknown as JiraClient;
