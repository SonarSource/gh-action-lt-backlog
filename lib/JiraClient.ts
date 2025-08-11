import { Config } from './Configuration';
import { Team } from './Team';

type TeamSearchV2NodeTeam = {
  id: string;
  displayName: string;
}

type TeamSearchV2Node = {
  team: TeamSearchV2NodeTeam;
}

type PageInfo = {
  hasNextPage: boolean;
  endCursor: string;
}

type TeamSearchV2Result = {
  nodes: TeamSearchV2Node[];
  pageInfo: PageInfo;
}

type TeamSearchV2Team = {
  teamSearchV2: TeamSearchV2Result;
}

type TeamSearchV2Data = {
  team?: TeamSearchV2Team
}

type TeamSearchV2Response = {
  errors?: unknown[];
  data: TeamSearchV2Data;
}

type Sprint = {
  id: number;
  name: string;
  originBoardId: number;
  endDate: string;
}

type Transition = {
  id: string;
  name: string;
}

type RemoteLink = {
  id: string,
  object: {
    url: string,
    title: string
  }
}

type Account = {
  accountId: string;
  emailAddress: string;
  displayName: string;
}

type NamedItem = {
  id: string;
  name: string;
}

export type Issue = {
  key: string;
  fields: {
    summary: string;
    creator: Account;
    assignee: Account;
    issuetype: NamedItem;
    status: NamedItem;
    components: NamedItem[];
    customfield_11227: Account[]; // Reviewers
    customfield_11228: Account[]; // Reviewed by
  }
}

export type Project = {
  components: NamedItem[];
  lead: Account;
}

export class JiraClient {
  private readonly domain: string;
  private readonly siteId: string;
  private readonly organizationId: string;
  private readonly token: string;

  constructor(domain: string, siteId: string, organizationId: string, user: string, token: string) {
    this.domain = domain;
    this.siteId = siteId;
    this.organizationId = organizationId;
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
    return response?.key || null;
  }

  public loadIssue(issueKey: string): Promise<Issue> {
    console.log(`Load issue '${issueKey}'`);
    return this.sendRestGetApi(`issue/${issueKey}`);
  }

  public loadProject(projectKey: string): Promise<Project> {
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

  public async findTransition(issueId: string, transitionName: string): Promise<Transition> {
    const transitions: Transition[] = (await this.sendRestGetApi(`issue/${issueId}/transitions`))?.transitions ?? [];
    return transitions.find((x) => x.name === transitionName) || null;
  }

  public async transitionIssue(issueId: string, transition: Transition, fields: any = null): Promise<void> {
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

  public loadIssueRemoteLinks(issueId: string): Promise<RemoteLink[]> {
    console.log(`${issueId}: Load remote links for ${issueId}`);
    return this.sendRestGetApi(`issue/${issueId}/remotelink`);
  }

  public async findAccountId(email: string): Promise<string> {
    if (email == null) {
      console.log('Could not find accountId, email is null');
      return null;
    }
    const logUser = email.substring(0, email.indexOf('@')).replace('.', ' '); // Do not leak email addresses to logs
    console.log(`Searching for user: ${logUser}`);
    let accounts: Account[] = (await this.sendRestGetApi(`user/search?query=${encodeURIComponent(email)}`)) ?? [];
    accounts = accounts.filter((x: Account) => x.emailAddress === email); // Just in case the address is part of the name, or other unexpected field
    if (accounts.length === 0) {
      console.log(`Could not find user ${logUser} in Jira`);
      return null;
    }
    else {
      console.log(`Found ${accounts.length} account(s), using ${accounts[0].accountId} ${accounts[0].displayName}`);
      return accounts[0].accountId;
    }
  };

  public findBoard(boardId: number): Promise<{ id: number, name: string } | null> {
    console.log(`Searching for boardId ${boardId}`);
    return this.sendRestGetAgile(`board/${boardId}`);
  }

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

  public async findTeamByUser(accountId: string): Promise<Team> {
    console.log(`Searching for teams of account ${accountId}`);
    return this.findTeam(`membership: { memberIds: "${accountId}" }`, x => true); // No post-filtering
  }

  public async findTeamByName(teamName: string): Promise<Team> {
    console.log(`Searching for team ${teamName}`);
    return this.findTeam(`query: "${teamName}"`, x => x.name === teamName); // Query returns also partial matches. We need to post-filter them
  }

  private async findTeam(queryFilter: string, resultFilter: (x: Team) => boolean): Promise<Team> {
    const nodes = (await this.findTeams(queryFilter)).filter(resultFilter);
    if (nodes.length === 0) {
      console.log(`Could not find team in Jira`);
      return null;
    }
    else {
      const match = nodes.find((x: Team) => Config.findTeam(x.name) != null) ?? nodes[0]; // Prefer teams that are defined in config to avoid OU-based, ad-hoc, and test teams
      console.log(`Found ${nodes.length} team(s), using ${match.id} ${match.name}`);
      return match;
    }
  }

  private async findTeams(queryFilter: string): Promise<Team[]> {
    const allTeams: Team[] = [];
    let after: string = null;     // Must be serialized to 'after: null' in the string, because 'after: ""' does not work.
    let hasNextPage: boolean = true;
    while (hasNextPage) {
      const response: TeamSearchV2Response = await this.sendGraphQL(`
        query MandatoryButUselessQueryName {
          team {
            teamSearchV2 (
              siteId: "${this.siteId}",
              organizationId: "ari:cloud:platform::org/${this.organizationId}",
              filter: { ${queryFilter} }
              after: "${after}"
            )
            {
              nodes {
                team { id displayName }
              }
              pageInfo {
                hasNextPage # This is lying and returning false only on the last page :facepalm:
                endCursor
              }
            }
          }
        }`);
      if (!response) {
        console.log(`ERROR: Failed to search for teams.`);  // The http error was likely already logged
        return [];
      } else if (response.errors) {
        console.log(`ERROR: Failed to search for teams. ${JSON.stringify(response.errors, null, 2)}`);
        return [];
      } else {
        const teamData = response.data.team.teamSearchV2;
        for (const team of teamData.nodes) {
          const id = team.team.id.split('/').pop(); // id has format of "ari:cloud:identity::team/3ca60b21-53c7-48e2-a2e2-6e85b39551d0"
          allTeams.push({ id, name: team.team.displayName });
        }
        hasNextPage = teamData.pageInfo.hasNextPage;
        after = teamData.pageInfo.endCursor;
      }
    }
    return allTeams;
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
    const url = `${this.domain}/${path}`;
    const response = await fetch(url, {
      method,
      headers: {
        'Authorization': `Basic ${this.token}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Accept-Language': 'en',  // Otherwise Patlassian* returns errors in Chineese :facepalm:
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
