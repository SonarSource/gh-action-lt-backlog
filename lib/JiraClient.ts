import fetch from 'node-fetch';
import { JIRA_DOMAIN } from './Constants';

export class JiraClient {
    private readonly token: string;

    constructor(user: string, token: string) {
        this.token = Buffer.from(`${user}:${token}`).toString('base64');
    }

    public async createIssue(projectKey: string, issueType: string, summary: string, additionalFields?: any): Promise<string> {
        const request = {
            fields: {
                project: { key: projectKey },
                issuetype: { name: issueType },
                summary,
                ...additionalFields
            },
        }
        console.log(`Creating issue in project '${projectKey}'`);
        console.log(JSON.stringify(request, null, 2));
        const response = await this.sendJiraPost('issue', request);
        return response?.key;
    }

    public getIssue(issueKey: string): Promise<any> {
        console.log(`Get issue '${issueKey}'`);
        return this.sendJiraGet(`issue/${issueKey}`);
    }

    public async moveIssue(issueId: string, transitionName: string): Promise<void> {
      const transition = await this.findTransition(issueId, transitionName);
      if (transition != null) {
        await this.transitionIssue(issueId, transition);
      }
    }

    private async findTransition(issueId: string, transitionName: string): Promise<any> {
        const transitions = (await this.sendJiraGet(`issue/${issueId}/transitions`))?.transitions ?? [];
        const transition = transitions.find((x: any) => x.name === transitionName);
        if (transition == null) {
            console.log(`${issueId}: Could not find the transition '${transitionName}'`);
        }
        return transition;
    }

    private async transitionIssue(issueId: string, transition: any): Promise<void> {
        console.log(`${issueId}: Executing '${transition.name}' (${transition.id}) transition`);
        await this.sendJiraPost(`issue/${issueId}/transitions`, { transition: { id: transition.id } });
        console.log(`${issueId}: Transition '${transition.name}' successfully excecuted.`);
    }

    private async sendJiraGet(endpoint: string): Promise<any> {
        return this.sendJiraRequest("GET", endpoint);
    }

    private async sendJiraPost(endpoint: string, body: any): Promise<any> {
        return this.sendJiraRequest("POST", endpoint, body);
    }

    private async sendJiraRequest(method: "GET" | "POST", endpoint: string, body?: any): Promise<any> {
        const url = `${JIRA_DOMAIN}/rest/api/3/${endpoint}`;
        const response = await fetch(url, {
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
            return data
        } else {
            console.log(`${response.status} (${response.statusText}): ${data?.errorMessages.join('. ') ?? 'Unknown error'}`);
            return null
        }
    }
}
