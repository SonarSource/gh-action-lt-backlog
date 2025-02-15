"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JiraClient = void 0;
const node_fetch_1 = require("node-fetch");
const Constants_1 = require("./Constants");
class JiraClient {
    constructor(user, token) {
        this.token = Buffer.from(`${user}:${token}`).toString('base64');
    }
    async createIssue(projectKey, summary, additionalFields) {
        const request = {
            fields: {
                project: { key: projectKey },
                summary,
                ...additionalFields
            },
        };
        console.log(`Creating issue in project '${projectKey}'`);
        console.log(JSON.stringify(request, null, 2));
        const response = await this.sendJiraPost('issue', request);
        return response?.key;
    }
    getIssue(issueKey) {
        console.log(`Get issue '${issueKey}'`);
        return this.sendJiraGet(`issue/${issueKey}`);
    }
    async moveIssue(issueId, transitionName, fields = null) {
        const transition = await this.findTransition(issueId, transitionName);
        if (transition == null) {
            console.log(`${issueId}: Could not find the transition '${transitionName}'`);
        }
        else {
            await this.transitionIssue(issueId, transition, fields);
        }
    }
    async findTransition(issueId, transitionName) {
        const transitions = (await this.sendJiraGet(`issue/${issueId}/transitions`))?.transitions ?? [];
        return transitions.find((x) => x.name === transitionName);
    }
    async transitionIssue(issueId, transition, fields = null) {
        console.log(`${issueId}: Executing '${transition.name}' (${transition.id}) transition`);
        await this.sendJiraPost(`issue/${issueId}/transitions`, { transition: { id: transition.id }, fields });
    }
    async assignIssue(issueId, userEmail) {
        const accountId = await this.findAccountId(userEmail);
        if (accountId != null) {
            console.log(`${issueId}: Assigning to ${accountId}`);
            await this.sendJiraPut(`issue/${issueId}/assignee`, { accountId });
        }
    }
    async findAccountId(email) {
        const logUser = email.substring(0, email.indexOf('@')).replace('.', ' '); // Do not leak email addresses to logs
        console.log(`Searching for user: ${logUser}`);
        let accounts = (await this.sendJiraGet(`user/search?query=${encodeURIComponent(email)}`)) ?? [];
        accounts = accounts.filter((x) => x.emailAddress === email); // Just in case the address is part of the name, or other unexpected field
        switch (accounts.length) {
            case 0:
                console.log(`Could not find user ${logUser} in Jira`);
                return null;
            case 1:
                console.log(`Found single account ${accounts[0].accountId} ${accounts[0].displayName}`);
                return accounts[0].accountId;
            default:
                console.log(`Found ${accounts.length} accounts, using ${accounts[0].accountId} ${accounts[0].displayName}`);
                return accounts[0].accountId;
        }
        ;
    }
    ;
    async sendJiraGet(endpoint) {
        return this.sendJiraRequest("GET", endpoint);
    }
    async sendJiraPost(endpoint, body) {
        return this.sendJiraRequest("POST", endpoint, body);
    }
    async sendJiraPut(endpoint, body) {
        return this.sendJiraRequest("PUT", endpoint, body);
    }
    async sendJiraRequest(method, endpoint, body) {
        const url = `${Constants_1.JIRA_DOMAIN}/rest/api/3/${endpoint}`;
        const response = await (0, node_fetch_1.default)(url, {
            method,
            headers: {
                'Authorization': `Basic ${this.token}`,
                'Accept': 'application/json',
                'Content-Type': 'application/json',
            },
            body: body ? JSON.stringify(body) : undefined,
        });
        const responseContent = await response.text();
        const data = responseContent.length > 0 ? JSON.parse(responseContent) : null;
        if (response.ok) {
            return data;
        }
        else {
            console.log(`${response.status} (${response.statusText}): ${data?.errorMessages.join('. ') ?? 'Unknown error'}`);
            if (data != null) {
                console.log(JSON.stringify(data, null, 2));
            }
            return null;
        }
    }
}
exports.JiraClient = JiraClient;
//# sourceMappingURL=JiraClient.js.map