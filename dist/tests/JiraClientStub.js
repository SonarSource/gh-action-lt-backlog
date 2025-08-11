"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.jiraClientStub = void 0;
const TeamConfiguration_1 = require("../Data/TeamConfiguration");
exports.jiraClientStub = {
    async loadIssue(issueId) {
        switch (issueId) {
            case 'MMF-1111': return { key: 'MMF-1111', fields: { project: { key: 'MMF' }, issuetype: { name: 'Epic' } } };
            case 'KEY-1111': return { key: 'KEY-1111', fields: { project: { key: 'KEY' }, issuetype: { name: 'Epic' } } };
            case 'KEY-1234': return { key: 'KEY-1234', fields: { project: { key: 'KEY' }, issuetype: { name: 'Task' }, creator: { displayName: "Creator of KEY-1234" } } };
            case 'KEY-5678': return { key: 'KEY-5678', fields: { project: { key: 'KEY' }, issuetype: { name: 'Task' }, creator: { displayName: "Jira Tech User GitHub" } } };
            case 'KEY-5555': return { key: 'KEY-5555', fields: { project: { key: 'KEY' }, issuetype: { name: 'Sub-task' } } };
            case 'FAKE-1234': return null;
            default: throw new Error(`Scaffolding did not expect ${issueId}`);
        }
    },
    async loadProject(projectKey) {
        return projectKey === 'KEY'
            ? { lead: { accountId: '1234-account', displayName: 'Project Lead' } }
            : { lead: { accountId: '2222-no-team', displayName: 'Project Lead Without team' } };
    },
    async findAccountId(email) {
        switch (email) {
            case 'user@sonarsource.com': return '1234-account';
            case 'eng.exp@sonarsource.com': return '3333-eng-exp-account';
            case 'renovate@renovate.com': return null;
            case 'dependabot@dependabot.com': return null;
            default: throw new Error(`Scaffolding did not expect email ${email}`);
        }
    },
    async findTeamByUser(accountId) {
        switch (accountId) {
            case '1234-account': return { name: '.NET Squad', id: 'dot-neeet-team' };
            case '2222-no-team': return null;
            case '3333-eng-exp-account': return TeamConfiguration_1.EngineeringExperienceSquad;
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
    async assignIssueToEmail(issueId, userEmail) {
        console.log(`Invoked jira.assignIssueToEmail('${issueId}', '${userEmail}')`);
    },
    async createComponent(projectKey, name, description) {
        console.log(`Invoked jira.createComponent('${projectKey}', '${name}', '${description}')`);
        return true;
    },
    async addIssueComponent(issueId, name) {
        console.log(`Invoked jira.addIssueComponent('${issueId}', '${name}')`);
        return true;
    },
    async addReviewer(issueId, userEmail) {
        console.log(`Invoked jira.addReviewer('${issueId}', '${userEmail}')`);
    },
    async addReviewedBy(issueId, userEmail) {
        console.log(`Invoked jira.addReviewedBy('${issueId}', '${userEmail}')`);
    }
};
//# sourceMappingURL=JiraClientStub.js.map