import fetch from 'node-fetch';
import { JIRA_SITE_ID, JIRA_DOMAIN, JIRA_ORGANIZATION_ID } from './Constants';

export class JiraClient {
  private readonly token: string;

  constructor(user: string, token: string) {
    this.token = Buffer.from(`${user}:${token}`).toString('base64');
  }

  public async createIssue(projectKey: string, summary: string, additionalFields: any): Promise<string> {
    const request = {
      fields: {
        project: { key: projectKey },
        summary,
        ...additionalFields
      },
    }
    console.log(`Creating issue in project '${projectKey}'`);
    console.log(JSON.stringify(request, null, 2));
    const response = await this.sendRestPost('issue', request);
    return response?.key;
  }

  public getIssue(issueKey: string): Promise<any> {
    console.log(`Get issue '${issueKey}'`);
    return this.sendRestGet(`issue/${issueKey}`);
  }

  public getProject(projectKey: string): Promise<any> {
    console.log(`Get project '${projectKey}'`);
    return this.sendRestGet(`project/${projectKey}`);
  }

  public async moveIssue(issueId: string, transitionName: string, fields: any = null): Promise<void> {
    const transition = await this.findTransition(issueId, transitionName);
    if (transition == null) {
      console.log(`${issueId}: Could not find the transition '${transitionName}'`);
    }
    else {
      await this.transitionIssue(issueId, transition, fields);
    }
  }

  public async findTransition(issueId: string, transitionName: string): Promise<any> {
    const transitions = (await this.sendRestGet(`issue/${issueId}/transitions`))?.transitions ?? [];
    return transitions.find((x: any) => x.name === transitionName);
  }

  public async transitionIssue(issueId: string, transition: any, fields: any = null): Promise<void> {
    console.log(`${issueId}: Executing '${transition.name}' (${transition.id}) transition`);
    await this.sendRestPost(`issue/${issueId}/transitions`, { transition: { id: transition.id }, fields });
  }

  public async assignIssueToEmail(issueId: string, userEmail: string): Promise<void> {
    const accountId = await this.findAccountId(userEmail);
    if (accountId != null) {
      await this.assignIssueToAccount(issueId, accountId);
    }
  }

  public async assignIssueToAccount(issueId: string, accountId: string): Promise<void> {
    console.log(`${issueId}: Assigning to ${accountId}`);
    await this.sendRestPut(`issue/${issueId}/assignee`, { accountId });
  }

  public async findAccountId(email: string): Promise<string> {
    if (email == null) {
      console.log('Could not find accountId, email is null');
      return null;
    }
    const logUser = email.substring(0, email.indexOf('@')).replace('.', ' '); // Do not leak email addresses to logs
    console.log(`Searching for user: ${logUser}`);
    let accounts: any[] = (await this.sendRestGet(`user/search?query=${encodeURIComponent(email)}`)) ?? [];
    accounts = accounts.filter((x: any) => x.emailAddress === email); // Just in case the address is part of the name, or other unexpected field
    if (accounts.length === 0) {
      console.log(`Could not find user ${logUser} in Jira`);
      return null;
    }
    else {
      console.log(`Found ${accounts.length} account(s), using ${accounts[0].accountId} ${accounts[0].displayName}`);
      return accounts[0].accountId;
    }
  };

  public async findTeamId(accountId: string): Promise<string> {
    console.log(`Searching for teams of account ${accountId}`);
    const { data: { team: { teamSearchV2: { nodes } } } } = await this.sendGraphQL(`
      query MandatoryButUselessQueryName {
        team {
          teamSearchV2 (
            siteId: "${JIRA_SITE_ID}",
            organizationId: "ari:cloud:platform::org/${JIRA_ORGANIZATION_ID}",
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
      const id = nodes[0].team.id.split('/').pop(); // id has format of "ari:cloud:identity::team/3ca60b21-53c7-48e2-a2e2-6e85b39551d0"
      console.log(`Found ${nodes.length} team(s), using ${id} ${nodes[0].team.displayName}`);
      return id;
    }
  }

  private async sendGraphQL(query: any): Promise<any> {
    return this.sendRequest("POST", "gateway/api/graphql", { query });
  }

  private async sendRestGet(endpoint: string): Promise<any> {
    return this.sendRequest("GET", `rest/api/3/${endpoint}`);
  }

  private async sendRestPost(endpoint: string, body: any): Promise<any> {
    return this.sendRequest("POST", `rest/api/3/${endpoint}`, body);
  }

  private async sendRestPut(endpoint: string, body: any): Promise<any> {
    return this.sendRequest("PUT", `rest/api/3/${endpoint}`, body);
  }

  private async sendRequest(method: "GET" | "POST" | "PUT", path: string, body?: any): Promise<any> {
    const url = `${JIRA_DOMAIN}/${path}`;
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
      if (data != null) {
        console.log(JSON.stringify(data, null, 2));
      }
      return null;
    }
  }
}
