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
import { JiraTeams } from "../Data/TeamConfiguration.js";
import { JiraClient } from '../lib/JiraClient.js';
function serializeStrings(values) {
    return '[' + values.map(x => `'${x}'`).join(', ') + ']';
}
export const jiraClientStub = {
    async loadIssue(issueId) {
        switch (issueId) {
            case 'MMF-1111': return { key: 'MMF-1111', fields: { project: { key: 'MMF' }, issuetype: { name: 'Initiative' } } };
            case 'EPIC-111': return { key: 'EPIC-111', fields: { project: { key: 'EPIC' }, issuetype: { name: 'Epic' } } };
            case 'KEY-1234': return { key: 'KEY-1234', fields: { project: { key: 'KEY' }, issuetype: { name: 'Maintenance' }, creator: { displayName: "Creator of KEY-1234" } } };
            case 'KEY-5678': return { key: 'KEY-5678', fields: { project: { key: 'KEY' }, issuetype: { name: 'Maintenance' }, creator: { displayName: "Jira Tech User GitHub" } } };
            case 'KEY-5555': return { key: 'KEY-5555', fields: { project: { key: 'KEY' }, issuetype: { name: 'Sub-task' } } };
            case 'SUBMIT-1': return { key: 'SUBMIT-1', fields: { project: { key: 'SUBMIT' }, issuetype: { name: 'Maintenance' }, assignee: null } };
            case 'SUBMIT-2': return { key: 'SUBMIT-2', fields: { project: { key: 'SUBMIT' }, issuetype: { name: 'Maintenance' }, assignee: { accountId: '4242-4242', emailAddress: 'user@sonarsource.com', displayName: 'User' } } };
            case 'SUBMIT-3': return { key: 'SUBMIT-3', fields: { project: { key: 'SUBMIT' }, issuetype: { name: 'Maintenance' }, assignee: { accountId: '712020:9c105dc5-0493-4d71-83a6-ed21c4ba03c0', emailAddress: 'nigel@sonarsource.com', displayName: 'Jira False Positive Bot' } } };
            case 'THEME-42': return { key: 'THEME-42', fields: { project: { key: 'THEME' }, issuetype: { name: 'Theme' } } };
            case 'FAKE-1234': return null;
            default: throw new Error(`Scaffolding did not expect ${issueId}`);
        }
    },
    async loadProject(projectKey) {
        return projectKey === 'KEY'
            ? { lead: { accountId: '1234-account', displayName: 'Project Lead' } }
            : { lead: { accountId: '2222-no-team', displayName: 'Project Lead Without team' } };
    },
    async findAccountId(emails) {
        return JiraClient.prototype.findAccountId.call(jiraClientStub, emails);
    },
    async findAccountIdFromEmail(email) {
        switch (email) {
            case 'user@sonarsource.com': return '1234-account';
            case 'eng.exp@sonarsource.com': return '3333-eng-exp-account';
            case 'team.without.evergreen.epics@sonarsource.com': return '4444-no-epics-account';
            case 'teamreview.triagger@sonarsource.com': return '5000-teamreview-triagger-account';
            case 'unknown@sonarsource.com': return null;
            case 'renovate@renovate.com': return null;
            case 'dependabot@dependabot.com': return null;
            default: throw new Error(`Scaffolding did not expect email ${email}`);
        }
    },
    async findTeamByUser(accountId) {
        switch (accountId) {
            case '1234-account': return { name: '.NET Squad', id: 'dot-neeet-team' };
            case '2222-no-team': return null;
            case '3333-eng-exp-account': return JiraTeams.EngineeringExperience;
            case '4444-no-epics-account': return { name: 'No Epics Squad', id: 'no-epics-team' };
            default: throw new Error(`Scaffolding did not expect accountId ${accountId}`);
        }
        ;
    },
    async findTeamByName(accountId) {
        switch (accountId) {
            case 'fallback-team': return { name: 'Analysis Processing Squad', id: 'fallback-team' };
            case 'nonexistent-fallback-team': return null;
            default: throw new Error(`Scaffolding did not expect team name ${accountId}`);
        }
    },
    async findTransition(issueId, transitionName) {
        switch (transitionName) {
            case 'Merge into master': return issueId === "KEY-1111" ? null : { id: '10000', name: transitionName };
            case 'Merge into branch': return issueId === "KEY-1111" ? null : { id: '10001', name: transitionName };
            case 'Merge': return { id: '10002', name: transitionName };
            default: return null; // No transition found
        }
    },
    async findSprintId(boardId) {
        return 42;
    },
    async findIssues(jql) {
        switch (jql) {
            case 'issuetype = Epic AND statusCategory != Done AND (summary ~ "KTLO" OR summary ~ "Evergreen") and "Start date[Date]"<=startOfDay() and duedate>=startOfDay() and "Team[Team]"=dot-neeet-team ORDER BY key':
                return [
                    { key: 'NET-1000', fields: { summary: '.NET KTLO Epic' } },
                    { key: 'NET-0000', fields: { summary: 'Duplicate epic from same period that should not be used' } }
                ];
            case 'issuetype = Epic AND statusCategory != Done AND (summary ~ "KTLO" OR summary ~ "Evergreen") and "Start date[Date]"<=startOfDay() and duedate>=startOfDay() and "Team[Team]"=fallback-team ORDER BY key':
                return [];
            case 'issuetype = Epic AND statusCategory != Done AND (summary ~ "KTLO" OR summary ~ "Evergreen") and "Start date[Date]"<=startOfDay() and duedate>=startOfDay() and "Team[Team]"=no-epics-team ORDER BY key':
                return [];
            case 'issuetype = Epic AND statusCategory != Done AND (summary ~ "KTLO" OR summary ~ "Evergreen") and "Start date[Date]"<=startOfDay() and duedate>=startOfDay() and "Team[Team]"=eb40f25e-3596-4541-b661-cf83e7bc4fa6 ORDER BY key':
                return [{ key: 'BUILD-1000', fields: { summary: 'Eng Exp KTLO Epic' } }];
            case 'issuetype = Epic AND statusCategory != Done AND (summary ~ "KTLO" OR summary ~ "Evergreen") and "Start date[Date]"<=startOfDay() and duedate>=startOfDay() and "Team[Team]"=772ea1dc-3574-42bc-a378-7a898d910ebd ORDER BY key':
                return [{ key: 'SC-3333', fields: { summary: 'SC KTLO Epic platform-cloud-eng-squad' } }];
            case 'issuetype = Epic AND statusCategory != Done AND (summary ~ "PREQ") and "Start date[Date]"<=startOfDay() and duedate>=startOfDay() and "Team[Team]"=772ea1dc-3574-42bc-a378-7a898d910ebd ORDER BY key':
                return [{ key: 'SC-1000', fields: { summary: 'Current SC Review Epic platform-cloud-eng-squad' } }];
            case 'issuetype = Epic AND statusCategory != Done AND (summary ~ "PREQ") and "Start date[Date]"<=startOfDay() and duedate>=startOfDay() and "Team[Team]"=6f2e744b-9f09-4c3a-852e-e2f138d1c14f ORDER BY key':
                return [{ key: 'SC-2222', fields: { summary: 'Current SC Review Epic platform-cloud-prod-eng-squad' } }];
            default:
                throw new Error(`Scaffolding did not expect JQL: ${jql}`);
        }
    },
    async createIssue(projectKey, summary, additionalFields) {
        console.log(`Invoked jira.createIssue('${projectKey}', '${summary}', ${JSON.stringify(additionalFields)})`);
        return `${projectKey}-4242`;
    },
    async addIssueRemoteLink(issueId, url, title = null) {
        title = title ? `'${title}'` : 'null';
        console.log(`Invoked jira.addIssueRemoteLink('${issueId}'', '${url}', ${title})`);
    },
    async moveIssue(issueId, transitionName, fields = null) {
        fields = fields ? JSON.stringify(fields) : 'null';
        console.log(`Invoked jira.moveIssue('${issueId}', '${transitionName}', ${fields})`);
    },
    async transitionIssue(issueId, transition, fields = null) {
        console.log(`Invoked jira.transitionIssue('${issueId}', ${JSON.stringify(transition)}, ${JSON.stringify(fields)})`);
    },
    async assignIssueToAccount(issueId, accountId) {
        console.log(`Invoked jira.assignIssueToAccount('${issueId}', '${accountId}')`);
    },
    async assignIssueToEmail(issueId, userEmails) {
        console.log(`Invoked jira.assignIssueToEmail('${issueId}', ${serializeStrings(userEmails)})`);
    },
    async createComponent(projectKey, name, description) {
        console.log(`Invoked jira.createComponent('${projectKey}', '${name}', '${description}')`);
        return true;
    },
    async addIssueComponent(issueId, name) {
        console.log(`Invoked jira.addIssueComponent('${issueId}', '${name}')`);
        return true;
    },
    async findIssueFixVersions(issueKey) {
        if (issueKey === 'KEY-9001') {
            return [{ id: '99', name: '9.8' }];
        }
        if (issueKey === 'KEY-9002') {
            return null;
        }
        return [];
    },
    async findProjectVersions(projectKey) {
        if (projectKey === 'KEY') {
            return [
                { id: '1', name: '8.31', released: false, archived: false },
                { id: '2', name: '8.32', released: false, archived: false },
            ];
        }
        if (projectKey === 'KEY-NOVERSION') {
            return [{ id: '3', name: '1.0', released: true, archived: false }];
        }
        throw new Error(`Scaffolding did not expect project ${projectKey}`);
    },
    async addFixVersion(issueKey, versionName) {
        console.log(`Invoked jira.addFixVersion('${issueKey}', '${versionName}')`);
    },
    async addReviewer(issueId, userEmails) {
        console.log(`Invoked jira.addReviewer('${issueId}', ${serializeStrings(userEmails)})`);
    },
    async addReviewedBy(issueId, userEmails) {
        console.log(`Invoked jira.addReviewedBy('${issueId}', ${serializeStrings(userEmails)})`);
    },
    async linkIssues(issueId, linkedIssueId, linkType) {
        console.log(`Invoked jira.linkIssues('${issueId}', '${linkedIssueId}', '${linkType}')`);
    }
};
//# sourceMappingURL=JiraClientStub.js.map