import * as core from '@actions/core';
import * as github from '@actions/github';
import * as graphqlTypes from '@octokit/graphql/dist-types/types';
import { GitHub } from '@actions/github/lib/utils';
import { Action } from './Action';
import { RestEndpointMethods } from '@octokit/plugin-rest-endpoint-methods/dist-types/generated/method-types';
import { PullRequest } from './OctokitTypes';
import fetch, { Response } from 'node-fetch';
import { graphql, GraphQlQueryResponseData } from '@octokit/graphql';

const JIRA_DOMAIN = 'https://sonarsource-sandbox-608.atlassian.net';

export abstract class OctokitAction extends Action {
  public readonly rest: RestEndpointMethods;
  protected readonly octokit: InstanceType<typeof GitHub>;
  private readonly jiraToken: string;
  private graphqlWithAuth: graphqlTypes.graphql;

  constructor() {
    super();
    this.jiraToken = Buffer.from(core.getInput('jira-token')).toString('base64');
    this.octokit = github.getOctokit(core.getInput('github-token'));
    this.rest = this.octokit.rest;
  }

  public sendGraphQL(query: string): Promise<GraphQlQueryResponseData> {
    if (!this.graphqlWithAuth) {
      this.graphqlWithAuth = graphql.defaults({
        headers: {
          authorization: `token ${this.getInput('github-token')}`,
        },
      });
    }
    return this.graphqlWithAuth(query);
  }

  protected async moveIssue(issueId: string, transitionName: string): Promise<void> {
    try {
      console.log(`${issueId}: Getting transition id for '${transitionName}'`);
      let transitions = await this.listTransitions(issueId);
      const transition = transitions.find((t: any) => t.name === transitionName);
      if (transition == null) {
        throw new Error(`Could not find the transition '${transitionName}'`);
      }
      console.log(`${issueId}: Executing '${transitionName}' (${transition.id}) transition`);
      await this.transitionIssue(issueId, transition.id);
      console.log(`${issueId}: Transition '${transitionName}' successfully excecuted.`);
    } catch (error) {
      console.warn(`${issueId}: Failed to move issue with the '${transitionName}' transition: ${error}`);
    }
  }

  protected getInput(name: string): string {
    return core.getInput(name);
  }

  protected getInputNumber(name: string): number {
    const input = this.getInput(name);
    const value = parseInt(input);
    if (isNaN(value)) {
      throw new Error(`Value of input '${name}' is not a number: ${input}`);
    } else {
      return value;
    }
  }

  protected getInputBoolean(name: string): boolean {
    return this.getInput(name).toLowerCase() === 'true';
  }

  protected async getPullRequest(pull_number: number): Promise<PullRequest> {
    try {
      this.log(`Getting PR #${pull_number}`);
      return (await this.rest.pulls.get(this.addRepo({ pull_number }))).data;
    } catch (error) {
      this.log(`Pull Request #${pull_number} not found: ${error}`);
      return null;
    }
  }

  protected async sendSlackMessage(text: string): Promise<void> {
    const channel = this.getInput("slack-channel");
    if (channel) {
      this.log("Sending Slack message");
      await this.sendSlackPost("https://slack.com/api/chat.postMessage", { channel, text });
    } else {
      this.log("Skip sending slack message, channel was not set.")
    }
  }

  private async listTransitions(issueId: string): Promise<any> {
    return (await this.sendJiraGet(`issue/${issueId}/transitions`)).transitions;
  }

  private async transitionIssue(issueId: string, transitionId: string): Promise<void> {
    this.sendJiraPost(`issue/${issueId}/transitions`, { transition: { id: transitionId } });
  }

  private async sendJiraGet(endpoint: string): Promise<any> {
    return this.sendJiraRequest("GET", endpoint);
  }

  private async sendJiraPost(endpoint: string, body: any): Promise<any> {
    return this.sendJiraRequest("POST", endpoint, body);
  }

  private async sendJiraRequest(method: "GET" | "POST" , endpoint: string, body?: any): Promise<any> {
    const url = `${JIRA_DOMAIN}/rest/api/3/${endpoint}`;

    const response = await fetch(url, {
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

    if (!response.ok) {
      throw new Error(`${response.status} (${response.statusText}): ${data?.errorMessages.join('. ') ?? 'Unknown error'}`);
    }

    return data;
  }

  private async sendSlackPost(url: string, jsonRequest: any): Promise<any> {
    const token = this.getInput("slack-token");
    if (!token) {
      throw new Error("slack-token was not set");
    }
    try {
      const body = JSON.stringify(jsonRequest);
      this.log(`Sending slack POST: ${body}`);
      const response = await fetch(url, {
        method: "POST",
        body,
        headers: { "Content-Type": "application/json; charset=utf-8", authorization: `Bearer ${token}` }
      });
      if (!response.ok) {
        this.log(`Failed to send API request. Error ${response.status}: ${response.statusText}`);
        return null;
      }
      const data = await response.json();
      if (!data.ok) {
        this.log(`Failed to send API request. Error: ${data.error}`);
        return null;
      }
      return data;
    } catch (ex) {
      this.log("Failed to send Slack request");
      this.log(ex);
      return null;
    }
  }
}
