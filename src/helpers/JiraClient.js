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
import { Config } from './Configuration.js';

function encodePathSegment(value) {
  return encodeURIComponent(String(value));
}

function logSafely(value) {
  console.log(String(value).replaceAll(/[\r\n\u2028\u2029]/g, ' '));
}

export class JiraClient {
  domain;
  siteId;
  organizationId;
  token;
  constructor(domain, siteId, organizationId, user, token) {
    const jiraUrl = new URL(domain);
    if (jiraUrl.protocol !== 'https:') {
      throw new TypeError('Jira domain must use HTTPS');
    }
    this.domain = jiraUrl.origin;
    this.siteId = siteId;
    this.organizationId = organizationId;
    this.token = Buffer.from(`${user}:${token}`).toString('base64');
  }
  async createIssue(projectKey, summary, additionalFields) {
    const request = {
      fields: {
        project: { key: projectKey },
        summary,
        ...additionalFields,
      },
    };
    logSafely(`Creating issue in project '${projectKey}'`);
    const response = await this.sendRestPostApi('issue', request);
    const issueId = response?.key || null;
    if (issueId) {
      logSafely(`Created issue: ${issueId}`);
    }
    return issueId;
  }
  loadIssue(issueKey) {
    logSafely(`Load issue '${issueKey}'`);
    return this.sendRestGetApi(`issue/${encodePathSegment(issueKey)}`);
  }
  loadProject(projectKey) {
    logSafely(`Load project '${projectKey}'`);
    return this.sendRestGetApi(`project/${encodePathSegment(projectKey)}`);
  }
  async moveIssue(issueId, transitionName, fields = null) {
    const transition = await this.findTransition(issueId, transitionName);
    if (transition == null) {
      logSafely(`${issueId}: Could not find the transition '${transitionName}'`);
    } else {
      await this.transitionIssue(issueId, transition, fields);
    }
  }
  async findTransition(issueId, transitionName) {
    const transitions =
      (await this.sendRestGetApi(`issue/${encodePathSegment(issueId)}/transitions`))?.transitions ??
      [];
    return transitions.find(x => x.name === transitionName) || null;
  }
  async transitionIssue(issueId, transition, fields = null) {
    logSafely(`${issueId}: Executing '${transition.name}' (${transition.id}) transition`);
    await this.sendRestPostApi(`issue/${encodePathSegment(issueId)}/transitions`, {
      transition: { id: transition.id },
      fields,
    });
  }
  async assignIssueToEmail(issueId, userEmails) {
    const accountId = await this.findAccountId(userEmails);
    if (accountId != null) {
      await this.assignIssueToAccount(issueId, accountId);
    }
  }
  async assignIssueToAccount(issueId, accountId) {
    logSafely(`${issueId}: Assigning to ${accountId}`);
    await this.sendRestPutApi(`issue/${encodePathSegment(issueId)}/assignee`, { accountId });
  }
  async addReviewer(issueId, userEmails) {
    const accountId = await this.findAccountId(userEmails);
    if (accountId != null) {
      logSafely(`${issueId}: Adding Reviewer ${accountId}`);
      const request = {
        update: {
          customfield_11227: [
            {
              add: { accountId }, // Nothing will happen if it already exists
            },
          ],
        },
      };
      await this.sendRestPutApi(`issue/${encodePathSegment(issueId)}?notifyUsers=false`, request);
    }
  }
  async addReviewedBy(issueId, userEmails) {
    const accountId = await this.findAccountId(userEmails);
    if (accountId != null) {
      logSafely(`${issueId}: Adding Reviewed by ${accountId}`);
      const request = {
        update: {
          customfield_11228: [
            {
              add: { accountId }, // Nothing will happen if it already exists
            },
          ],
        },
      };
      await this.sendRestPutApi(`issue/${encodePathSegment(issueId)}?notifyUsers=false`, request);
    }
  }
  async createComponent(projectKey, name, description) {
    logSafely(`Searching for component '${name}' in project ${projectKey}`);
    const { total, values } = await this.sendRestGetApi(
      `project/${encodeURIComponent(projectKey)}/component?query=${encodeURIComponent(name)}`,
    );
    if (values.some(x => x.name === name)) {
      // values contains matches on partial names and descriptions
      logSafely(`Component found in ${total} result(s)`);
      return true;
    } else {
      logSafely(`Component not found in ${total} result(s). Creating a new one.`);
      return (
        (await this.sendRestPostApi('component', { project: projectKey, name, description })) !=
        null
      );
    }
  }
  async addIssueComponent(issueId, name) {
    logSafely(`${issueId}: Adding component ${name}`);
    const request = {
      update: {
        components: [
          {
            add: { name }, // Nothing will happen if it already exists
          },
        ],
      },
    };
    return (
      (await this.sendRestPutApi(
        `issue/${encodePathSegment(issueId)}?notifyUsers=false`,
        request,
      )) != null
    );
  }
  async addIssueRemoteLink(issueId, url, title = null) {
    logSafely(`${issueId}: Adding remote link ${url}`);
    await this.sendRestPostApi(`issue/${encodePathSegment(issueId)}/remotelink`, {
      object: { url, title: title ?? url },
    });
  }
  async linkIssues(issueId, linkedIssueId, linkType) {
    logSafely(`Linking ${issueId} and ${linkedIssueId} as '${linkType}'`);
    await this.sendRestPostApi('issueLink', {
      type: { name: linkType },
      inwardIssue: { key: issueId },
      outwardIssue: { key: linkedIssueId },
    });
  }
  loadIssueRemoteLinks(issueId) {
    logSafely(`${issueId}: Load remote links for ${issueId}`);
    return this.sendRestGetApi(`issue/${encodePathSegment(issueId)}/remotelink`);
  }
  async findAccountId(emails) {
    for (const email of emails) {
      const accountId = await this.findAccountIdFromEmail(email);
      if (accountId) {
        return accountId;
      }
    }
    return null;
  }
  async findAccountIdFromEmail(email) {
    if (email == null) {
      logSafely('Could not find accountId, email is null');
      return null;
    }
    const logUser = email.substring(0, email.indexOf('@')).replace('.', ' '); // Do not leak email addresses to logs
    logSafely(`Searching for user: ${logUser}`);
    let accounts =
      (await this.sendRestGetApi(`user/search?query=${encodeURIComponent(email)}`)) ?? [];
    accounts = accounts.filter(x => x.emailAddress === email); // Just in case the address is part of the name, or other unexpected field
    if (accounts.length === 0) {
      logSafely(`Could not find user ${logUser} in Jira`);
      return null;
    } else {
      logSafely(
        `Found ${accounts.length} account(s), using ${accounts[0].accountId} ${accounts[0].displayName}`,
      );
      return accounts[0].accountId;
    }
  }
  findBoard(boardId) {
    logSafely(`Searching for boardId ${boardId}`);
    return this.sendRestGetAgile(`board/${encodePathSegment(boardId)}`);
  }
  async findSprintId(boardId) {
    logSafely(`Searching for active sprint in board ${boardId}`);
    let { values } = await this.sendRestGetAgile(
      `board/${encodePathSegment(boardId)}/sprint?state=active`,
    );
    values = values.filter(x => x.originBoardId === boardId); // Board filter can contain sprints from other boards
    if (values.length === 0) {
      logSafely(`Could not find active sprint in board ${boardId}`);
      return null;
    } else {
      const originalLength = values.length; // .pop() below removes an item from the array
      const sprint = values.sort((a, b) => a.endDate.localeCompare(b.endDate)).pop(); // There should be exactly one. If not, use the one ending later in case previous iteration was not closed yet.
      logSafely(`Found ${originalLength} active sprint(s), using ${sprint.id} ${sprint.name}`);
      return sprint.id;
    }
  }
  async findTeamByUser(accountId) {
    logSafely(`Searching for teams of account ${accountId}`);
    return this.findTeam(`membership: { memberIds: "${accountId}" }`, x => true); // No post-filtering
  }
  async findTeamByName(teamName) {
    logSafely(`Searching for team ${teamName}`);
    return this.findTeam(`query: "${teamName}"`, x => x.name === teamName); // Query returns also partial matches. We need to post-filter them
  }
  async findIssues(jql) {
    logSafely(`Searching for issues: ${jql}`);
    const response = await this.sendRestGetApi(
      `search/jql?fields=key,summary,customfield_10015,duedate&jql=${encodeURIComponent(jql)}`,
    ); // // Only first page of results
    return response?.issues ?? [];
  }
  async findTeam(queryFilter, resultFilter) {
    const nodes = (await this.findTeams(queryFilter)).filter(result => resultFilter(result));
    if (nodes.length === 0) {
      logSafely(`Could not find team in Jira`);
      return null;
    } else {
      const match = nodes.find(x => Config.findTeam(x.name) != null) ?? nodes[0]; // Prefer teams that are defined in config to avoid OU-based, ad-hoc, and test teams
      logSafely(`Found ${nodes.length} team(s), using ${match.id} ${match.name}`);
      return match;
    }
  }
  async findTeams(queryFilter) {
    const allTeams = [];
    let after = null; // Must be serialized to 'after: null' in the string, because 'after: ""' does not work.
    let hasNextPage = true;
    while (hasNextPage) {
      const response = await this.sendGraphQL(`
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
        logSafely(`ERROR: Failed to search for teams.`); // The http error was likely already logged
        return [];
      } else if (response.errors) {
        logSafely(`ERROR: Failed to search for teams. ${JSON.stringify(response.errors, null, 2)}`);
        return [];
      } else if (response.data.team) {
        const teamData = response.data.team.teamSearchV2;
        for (const team of teamData.nodes) {
          const id = team.team.id.split('/').pop(); // id has format of "ari:cloud:identity::team/3ca60b21-53c7-48e2-a2e2-6e85b39551d0"
          allTeams.push({ id, name: team.team.displayName });
        }
        hasNextPage = teamData.pageInfo.hasNextPage;
        after = teamData.pageInfo.endCursor;
      } else {
        hasNextPage = false;
      }
    }
    return allTeams;
  }
  async sendGraphQL(query) {
    logSafely(query); // Log only the GraphQL query, without the surrounding { "query": ... }
    return this.sendRequest('POST', 'gateway/api/graphql', { query });
  }
  async sendRestGetApi(endpoint) {
    return this.sendRequest('GET', `rest/api/3/${endpoint}`);
  }
  async sendRestGetAgile(endpoint) {
    return this.sendRequest('GET', `rest/agile/1.0/${endpoint}`);
  }
  async sendRestPostApi(endpoint, body) {
    logSafely(JSON.stringify(body, null, 2));
    return this.sendRequest('POST', `rest/api/3/${endpoint}`, body);
  }
  async sendRestPutApi(endpoint, body) {
    logSafely(JSON.stringify(body, null, 2));
    return this.sendRequest('PUT', `rest/api/3/${endpoint}`, body);
  }
  async sendRequest(method, path, body) {
    const url = new URL(path, `${this.domain}/`);
    if (url.origin !== this.domain) {
      throw new TypeError('Jira request URL must remain on the configured domain');
    }
    const response = await fetch(url, {
      method,
      headers: {
        Authorization: `Basic ${this.token}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'Accept-Language': 'en', // Otherwise Patlassian* returns errors in Chineese :facepalm:
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const responseContent = await response.text();
    const data = responseContent.length > 0 ? JSON.parse(responseContent) : {};
    if (response.ok) {
      return data;
    } else {
      logSafely(
        `${response.status} (${response.statusText}): ${data?.errorMessages?.join('. ') ?? 'Unknown error'}`,
      );
      if (data != null) {
        logSafely(JSON.stringify(data, null, 2));
      }
      return null;
    }
  }
}
