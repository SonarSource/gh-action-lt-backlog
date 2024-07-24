"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JiraClient = void 0;
const node_fetch_1 = require("node-fetch");
const JIRA_DOMAIN = 'https://sonarsource-sandbox-608.atlassian.net';
class JiraClient {
    constructor(user, token) {
        this.jiraToken = Buffer.from(`${user}:${token}`).toString('base64');
    }
    async findTransition(issueId, transitionName) {
        const transitions = (await this.sendJiraGet(`issue/${issueId}/transitions`))?.transitions ?? [];
        const transition = transitions.find((x) => x.name === transitionName);
        if (transition == null) {
            console.log(`${issueId}: Could not find the transition '${transitionName}'`);
        }
        return transition;
    }
    async transitionIssue(issueId, transition) {
        console.log(`${issueId}: Executing '${transition.name}' (${transition.id}) transition`);
        this.sendJiraPost(`issue/${issueId}/transitions`, { transition: { id: transition.id } });
        console.log(`${issueId}: Transition '${transition.name}' successfully excecuted.`);
    }
    async sendJiraGet(endpoint) {
        return this.sendJiraRequest("GET", endpoint);
    }
    async sendJiraPost(endpoint, body) {
        return this.sendJiraRequest("POST", endpoint, body);
    }
    async sendJiraRequest(method, endpoint, body) {
        const url = `${JIRA_DOMAIN}/rest/api/3/${endpoint}`;
        const response = await (0, node_fetch_1.default)(url, {
            method,
            headers: {
                'Authorization': `Basic ${this.jiraToken}`,
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
            return null;
        }
    }
}
exports.JiraClient = JiraClient;
//# sourceMappingURL=JiraClient.js.map