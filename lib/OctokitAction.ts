import * as core from '@actions/core';
import * as github from '@actions/github';
import * as graphqlTypes from '@octokit/graphql/dist-types/types';
import { GitHub } from '@actions/github/lib/utils';
import { Action } from './Action';
import { RestEndpointMethods } from '@octokit/plugin-rest-endpoint-methods/dist-types/generated/method-types';
import { PullRequest } from './OctokitTypes';
import fetch from 'node-fetch';
import { graphql, GraphQlQueryResponseData } from '@octokit/graphql';

export abstract class OctokitAction extends Action {
  public readonly rest: RestEndpointMethods;
  protected readonly octokit: InstanceType<typeof GitHub>;
  private graphqlWithAuth: graphqlTypes.graphql;

  constructor() {
    super();
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
