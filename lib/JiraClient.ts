import { JIRA_SITE_ID, JIRA_DOMAIN, JIRA_ORGANIZATION_ID } from './Constants';
import { Config } from './Configuration';
import { Team } from './Team';

interface TeamSearchV2Detail {
  id: string;
  displayName: string;
}

interface TeamSearchV2 {
  team: TeamSearchV2Detail;
}

interface Sprint {
  id: number;
  name: string;
  originBoardId: number;
  endDate: string;
}

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
    const response = await this.sendRestPostApi('issue', request);
    return response?.key;
  }

  public loadIssue(issueKey: string): Promise<any> {
    console.log(`Load issue '${issueKey}'`);
    return this.sendRestGetApi(`issue/${issueKey}`);
  }

  public loadProject(projectKey: string): Promise<any> {
    console.log(`Load project '${projectKey}'`);
    return this.sendRestGetApi(`project/${projectKey}`);
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
    const transitions = (await this.sendRestGetApi(`issue/${issueId}/transitions`))?.transitions ?? [];
    return transitions.find((x: any) => x.name === transitionName);
  }

  public async transitionIssue(issueId: string, transition: any, fields: any = null): Promise<void> {
    console.log(`${issueId}: Executing '${transition.name}' (${transition.id}) transition`);
    await this.sendRestPostApi(`issue/${issueId}/transitions`, { transition: { id: transition.id }, fields });
  }

  public async assignIssueToEmail(issueId: string, userEmail: string): Promise<void> {
    const accountId = await this.findAccountId(userEmail);
    if (accountId != null) {
      await this.assignIssueToAccount(issueId, accountId);
    }
  }

  public async assignIssueToAccount(issueId: string, accountId: string): Promise<void> {
    console.log(`${issueId}: Assigning to ${accountId}`);
    await this.sendRestPutApi(`issue/${issueId}/assignee`, { accountId });
  }

  public async addReviewer(issueId: string, userEmail: string): Promise<void> {
    const accountId = await this.findAccountId(userEmail);
    if (accountId != null) {
      console.log(`${issueId}: Adding Reviewer ${accountId}`);
      const request = {
        update: {
          customfield_11227: [{
            add: { accountId } // Nothing will happen if it already exists
          }]
        }
      };
      await this.sendRestPutApi(`issue/${issueId}?notifyUsers=false`, request);
    }
  }

  public async addReviewedBy(issueId: string, userEmail: string): Promise<void> {
    const accountId = await this.findAccountId(userEmail);
    if (accountId != null) {
      console.log(`${issueId}: Adding Reviewed by ${accountId}`);
      const request = {
        update: {
          customfield_11228: [{
            add: { accountId } // Nothing will happen if it already exists
          }]
        }
      };
      await this.sendRestPutApi(`issue/${issueId}?notifyUsers=false`, request);
    }
  }

  public async addIssueComponent(issueId: string, name: string): Promise<boolean> {
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

  public async addIssueRemoteLink(issueId: string, url: string, title: string = null): Promise<void> {
    console.log(`${issueId}: Adding remote link ${url}`);
    await this.sendRestPostApi(`issue/${issueId}/remotelink`, { object: { url, title: title ?? url } });
  }

  public async findAccountId(email: string): Promise<string> {
    if (email == null) {
      console.log('Could not find accountId, email is null');
      return null;
    }
    const logUser = email.substring(0, email.indexOf('@')).replace('.', ' '); // Do not leak email addresses to logs
    console.log(`Searching for user: ${logUser}`);
    let accounts: any[] = (await this.sendRestGetApi(`user/search?query=${encodeURIComponent(email)}`)) ?? [];
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

  public async findSprintId(boardId: number): Promise<number> {
    console.log(`Searching for active sprint in board ${boardId}`);
    let { values }: { values: Sprint[] } = await this.sendRestGetAgile(`board/${boardId}/sprint?state=active`);
    values = values.filter((x: Sprint) => x.originBoardId === boardId); // Board filter can contain sprints from other boards
    if (values.length === 0) {
      console.log(`Could not find active sprint in board ${boardId}`);
      return null;
    }
    else {
      const originalLength = values.length; // .pop() below removes an item from the array
      const sprint = values.sort((a, b) => a.endDate.localeCompare(b.endDate)).pop();  // There should be exactly one. If not, use the one ending later in case previous iteration was not closed yet.
      console.log(`Found ${originalLength} active sprint(s), using ${sprint.id} ${sprint.name}`);
      return sprint.id;
    }
  }

  public async findTeam(accountId: string): Promise<Team> {
    console.log(`Searching for teams of account ${accountId}`);
    const { data: { team: { teamSearchV2: { nodes } } } }: { data: { team: { teamSearchV2: { nodes: TeamSearchV2[] } } } } = await this.sendGraphQL(`
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
      const match = nodes.find((x: TeamSearchV2) => Config.findTeam(x.team.displayName) != null) ?? nodes[0]; // Prefer teams that are defined in config to avoid OU-based, ad-hoc, and test teams
      const id = match.team.id.split('/').pop(); // id has format of "ari:cloud:identity::team/3ca60b21-53c7-48e2-a2e2-6e85b39551d0"
      console.log(`Found ${nodes.length} team(s), using ${id} ${match.team.displayName}`);
      return { id, name: match.team.displayName };
    }
  }

  public async createComponent(projectKey: string, name: string, description: string): Promise<boolean> {
    console.log(`Searching for component '${name}' in project ${projectKey}`);
    const { total, values } = await this.sendRestGetApi(`project/${encodeURIComponent(projectKey)}/component?query=${encodeURIComponent(name)}`);
    if (values.find(x => x.name === name)) {  // values contains matches on partial names and descriptions
      console.log(`Component found in ${total} result(s)`);
      return true;
    } else {
      console.log(`Component not found in ${total} result(s). Creating a new one.`);
      return await this.sendRestPostApi('component', { project: projectKey, name, description }) != null;
    }
  }

  private async sendGraphQL(query: string): Promise<any> {
    console.log(query); // Log only the GraphQL query, without the surrounding { "query": ... }
    return this.sendRequest("POST", "gateway/api/graphql", { query });
  }

  private async sendRestGetApi(endpoint: string): Promise<any> {
    return this.sendRequest("GET", `rest/api/3/${endpoint}`);
  }

  private async sendRestGetAgile(endpoint: string): Promise<any> {
    return this.sendRequest("GET", `rest/agile/1.0/${endpoint}`);
  }

  private async sendRestPostApi(endpoint: string, body: any): Promise<any> {
    console.log(JSON.stringify(body, null, 2));
    return this.sendRequest("POST", `rest/api/3/${endpoint}`, body);
  }

  private async sendRestPutApi(endpoint: string, body: any): Promise<any> {
    console.log(JSON.stringify(body, null, 2));
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
    const data = responseContent.length > 0 ? JSON.parse(responseContent) : {};
    if (response.ok) {
      return data
    } else {
      console.log(`${response.status} (${response.statusText}): ${data?.errorMessages?.join('. ') ?? 'Unknown error'}`);
      if (data != null) {
        console.log(JSON.stringify(data, null, 2));
      }
      return null;
    }
  }
}
