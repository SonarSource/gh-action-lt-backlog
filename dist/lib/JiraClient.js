"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JiraClient = void 0;
const node_fetch_1 = require("node-fetch");
const Constants_1 = require("./Constants");
const Configuration_1 = require("./Configuration");
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
        const response = await this.sendRestPostApi('issue', request);
        return response?.key;
    }
    getIssue(issueKey) {
        console.log(`Get issue '${issueKey}'`);
        return this.sendRestGetApi(`issue/${issueKey}`);
    }
    getProject(projectKey) {
        console.log(`Get project '${projectKey}'`);
        return this.sendRestGetApi(`project/${projectKey}`);
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
        const transitions = (await this.sendRestGetApi(`issue/${issueId}/transitions`))?.transitions ?? [];
        return transitions.find((x) => x.name === transitionName);
    }
    async transitionIssue(issueId, transition, fields = null) {
        console.log(`${issueId}: Executing '${transition.name}' (${transition.id}) transition`);
        await this.sendRestPostApi(`issue/${issueId}/transitions`, { transition: { id: transition.id }, fields });
    }
    async assignIssueToEmail(issueId, userEmail) {
        const accountId = await this.findAccountId(userEmail);
        if (accountId != null) {
            await this.assignIssueToAccount(issueId, accountId);
        }
    }
    async assignIssueToAccount(issueId, accountId) {
        console.log(`${issueId}: Assigning to ${accountId}`);
        await this.sendRestPutApi(`issue/${issueId}/assignee`, { accountId });
    }
    async addIssueComponent(issueId, name) {
        console.log(`${issueId}: Adding component ${name}`);
        const request = {
            update: {
                components: [{
                        add: { name } // Nothing will happen if it already exists
                    }]
            }
        };
        return await this.sendRestPutApi(`issue/${issueId}?notifyUsers=false`, request) != null;
    }
    async findAccountId(email) {
        if (email == null) {
            console.log('Could not find accountId, email is null');
            return null;
        }
        const logUser = email.substring(0, email.indexOf('@')).replace('.', ' '); // Do not leak email addresses to logs
        console.log(`Searching for user: ${logUser}`);
        let accounts = (await this.sendRestGetApi(`user/search?query=${encodeURIComponent(email)}`)) ?? [];
        accounts = accounts.filter((x) => x.emailAddress === email); // Just in case the address is part of the name, or other unexpected field
        if (accounts.length === 0) {
            console.log(`Could not find user ${logUser} in Jira`);
            return null;
        }
        else {
            console.log(`Found ${accounts.length} account(s), using ${accounts[0].accountId} ${accounts[0].displayName}`);
            return accounts[0].accountId;
        }
    }
    ;
    async findSprintId(boardId) {
        console.log(`Searching for active sprint in board ${boardId}`);
        let { values } = await this.sendRestGetAgile(`board/${boardId}/sprint?state=active`);
        values = values.filter((x) => x.originBoardId === boardId); // Board filter can contain sprints from other boards
        if (values.length === 0) {
            console.log(`Could not find active sprint in board ${boardId}`);
            return null;
        }
        else {
            const originalLength = values.length; // .pop() below removes an item from the array
            const sprint = values.sort((a, b) => a.endDate.localeCompare(b.endDate)).pop(); // There should be exactly one. If not, use the one ending later in case previous iteration was not closed yet.
            console.log(`Found ${originalLength} active sprint(s), using ${sprint.id} ${sprint.name}`);
            return sprint.id;
        }
    }
    async findTeam(accountId) {
        console.log(`Searching for teams of account ${accountId}`);
        const { data: { team: { teamSearchV2: { nodes } } } } = await this.sendGraphQL(`
      query MandatoryButUselessQueryName {
        team {
          teamSearchV2 (
            siteId: "${Constants_1.JIRA_SITE_ID}",
            organizationId: "ari:cloud:platform::org/${Constants_1.JIRA_ORGANIZATION_ID}",
            filter: { membership: { memberIds: "${accountId}" } }
          )
          {
            nodes {
              team { id displayName }
            }
          }
        }
      }`);
        if (nodes.length === 0) {
            console.log(`Could not find team for account ${accountId} in Jira`);
            return null;
        }
        else {
            const match = nodes.find((x) => Configuration_1.Config.findTeam(x.team.displayName) != null) ?? nodes[0]; // Prefer teams that are defined in config to avoid OU-based, ad-hoc, and test teams
            const id = match.team.id.split('/').pop(); // id has format of "ari:cloud:identity::team/3ca60b21-53c7-48e2-a2e2-6e85b39551d0"
            console.log(`Found ${nodes.length} team(s), using ${id} ${match.team.displayName}`);
            return { id, name: match.team.displayName };
        }
    }
    async createComponent(projectKey, name) {
        console.log(`Searching for component '${name}' in project ${projectKey}`);
        const { total } = await this.sendRestGetApi(`project/${encodeURIComponent(projectKey)}/component?query=${encodeURIComponent(name)}`);
        if (total === 0) {
            console.log(`Component not found. Creating a new one.`);
            return await this.sendRestPostApi('component', { project: projectKey, name }) != null;
        }
        else {
            console.log(`Found '${total}' result(s)`);
            return true;
        }
    }
    async sendGraphQL(query) {
        return this.sendRequest("POST", "gateway/api/graphql", { query });
    }
    async sendRestGetApi(endpoint) {
        return this.sendRequest("GET", `rest/api/3/${endpoint}`);
    }
    async sendRestGetAgile(endpoint) {
        return this.sendRequest("GET", `rest/agile/1.0/${endpoint}`);
    }
    async sendRestPostApi(endpoint, body) {
        return this.sendRequest("POST", `rest/api/3/${endpoint}`, body);
    }
    async sendRestPutApi(endpoint, body) {
        return this.sendRequest("PUT", `rest/api/3/${endpoint}`, body);
    }
    async sendRequest(method, path, body) {
        if (body) {
            console.log(JSON.stringify(body, null, 2));
        }
        const url = `${Constants_1.JIRA_DOMAIN}/${path}`;
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
        const data = responseContent.length > 0 ? JSON.parse(responseContent) : {};
        if (response.ok) {
            return data;
        }
        else {
            console.log(`${response.status} (${response.statusText}): ${data?.errorMessages?.join('. ') ?? 'Unknown error'}`);
            if (data != null) {
                console.log(JSON.stringify(data, null, 2));
            }
            return null;
        }
    }
}
exports.JiraClient = JiraClient;
//# sourceMappingURL=JiraClient.js.map