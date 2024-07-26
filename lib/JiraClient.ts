import fetch from 'node-fetch';

const JIRA_DOMAIN = 'https://sonarsource-sandbox-608.atlassian.net';

export class JiraClient {
    private readonly token: string;

    constructor(user: string, token: string) { 
        this.token = Buffer.from(`${user}:${token}`).toString('base64');
    }

    public async createIssue(projectKey: string, issueType: any, summary: string): Promise<string> {
        console.log(`Creating issue in project '${projectKey}' of type '${issueType.name}' with summary: ${summary}`);
        const response = await this.sendJiraPost('issue', {
            fields: {
                project: { key: projectKey },
                issuetype: { id: issueType.id },
                summary
            }
        });
        return response?.key;
    }

    public async moveIssue(issueId: string, transitionName: string): Promise<void> {
      const transition = await this.findTransition(issueId, transitionName);
      if (transition != null) {
        await this.transitionIssue(issueId, transition);
      }
    }

    public async findTransition(issueId: string, transitionName: string): Promise<any> {
        const transitions = (await this.sendJiraGet(`issue/${issueId}/transitions`))?.transitions ?? [];
        const transition = transitions.find((x: any) => x.name === transitionName);
        if (transition == null) {
            console.log(`${issueId}: Could not find the transition '${transitionName}'`);
        }
        return transition;
    }

    public async transitionIssue(issueId: string, transition: any): Promise<void> {
        console.log(`${issueId}: Executing '${transition.name}' (${transition.id}) transition`);
        this.sendJiraPost(`issue/${issueId}/transitions`, { transition: { id: transition.id } });
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
