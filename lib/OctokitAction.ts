import * as core from '@actions/core';
import * as github from '@actions/github';
import * as graphqlTypes from '@octokit/graphql/dist-types/types';
import { GitHub } from '@actions/github/lib/utils';
import { Action } from './Action';
import { RestEndpointMethods } from '@octokit/plugin-rest-endpoint-methods/dist-types/generated/method-types';
import { PullRequest, IssueComment, addPullRequestExtensions, Issue } from './OctokitTypes';
import { graphql, GraphQlQueryResponseData } from '@octokit/graphql';
import { JiraClient } from './JiraClient';
import { JIRA_ISSUE_PATTERN, RENOVATE_PREFIX } from './Constants';

export abstract class OctokitAction extends Action {
  public readonly rest: RestEndpointMethods;
  protected readonly octokit: InstanceType<typeof GitHub>;
  protected readonly jira: JiraClient;
  protected readonly isEngXpSquad: boolean;
  private graphqlWithAuth: graphqlTypes.graphql;

  constructor() {
    super();
    this.jira = new JiraClient(this.getInput('jira-user'), this.getInput('jira-token'));
    this.octokit = github.getOctokit(this.getInput('github-token'));
    this.rest = this.octokit.rest;
    this.isEngXpSquad = this.getInputBoolean('is-eng-xp-squad');
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
      return addPullRequestExtensions((await this.rest.pulls.get(this.addRepo({ pull_number }))).data);
    } catch (error) {
      this.log(`Pull Request #${pull_number} not found: ${error}`);
      return null;
    }
  }

  protected async getIssue(issue_number: number): Promise<Issue> {
    try {
      this.log(`Getting issue #${issue_number}`);
      return (await this.rest.issues.get(this.addRepo({ issue_number }))).data;
    } catch (error) {
      this.log(`Issue #${issue_number} not found: ${error}`);
      return null;
    }
  }

  protected async findFixedIssues(pr: PullRequest): Promise<string[]> {
    const text = pr.isRenovate() // We're storing the ID in a comment as a workaround for https://github.com/renovatebot/renovate/issues/26833
      ? (await this.listComments(pr.number)).filter(x => x.body?.startsWith(RENOVATE_PREFIX)).pop()?.body
      : pr.title;
    return text?.match(JIRA_ISSUE_PATTERN);
  }

  protected async addComment(issue_number: number, body: string): Promise<void> {
    await this.rest.issues.createComment(this.addRepo({ issue_number, body }));
  }

  protected async listComments(issue_number: number): Promise<IssueComment[]> {
    return (await this.rest.issues.listComments(this.addRepo({ issue_number }))).data;
  }

  protected updatePullRequestTitle(prNumber: number, title: string): Promise<void> {
    this.log(`Updating PR #${prNumber} title to: ${title}`);
    return this.updatePullRequest(prNumber, { title });
  }

  protected updatePullRequestDescription(prNumber: number, body: string): Promise<void> {
    this.log(`Updating PR #${prNumber} description`);
    return this.updatePullRequest(prNumber, { body });
  }

  private async updatePullRequest(prNumber: number, update: { title?: string, body?: string }): Promise<void> {
    try {
      await this.rest.pulls.update(this.addRepo({ pull_number: prNumber, ...update }));
    } catch (error) {
      this.log(`Failed to update PR #${prNumber}: ${error}`);
    }
  }

  protected async findEmail(login: string): Promise<string> {

    // FIXME: DEBUG only
    return 'pavel.mikula@sonarsource.com';

    this.log(`Searching for SAML identity of ${login}`);
    const identities = await this.findExternalIdentities(login);
    if (identities.length === 0) {
      this.log(`No SAML identity found for ${login}`);
      return null;
    }
    return identities[0].samlIdentity.nameId;
  }

  private async findExternalIdentities(login: string): Promise<any[]> {
    const {
      organization: {
        samlIdentityProvider,
      },
    }: GraphQlQueryResponseData = await this.sendGraphQL(`
          query {
              organization(login: "${this.repo.owner}") {
                  samlIdentityProvider {
                      externalIdentities(first: 10, login: "${login}") {
                          nodes {
                              samlIdentity { nameId }
                          }
                      }
                  }
              }
          }`);
    if (samlIdentityProvider?.externalIdentities) {
      return samlIdentityProvider.externalIdentities.nodes;
    } else {
      this.log('ERROR: Provided GitHub token does not have permissions to query organization/samlIdentityProvider/externalIdentities.');
      return [];
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

  protected async processRequestReview(issueId: string, requested_reviewer: any): Promise<void> {
    if (requested_reviewer?.type === "Bot") {
      this.log(`Skipping request review from bot: ${requested_reviewer.login}`);
    } else {
      await this.jira.moveIssue(issueId, 'Request Review');
      if (requested_reviewer) {
        const userEmail = await this.findEmail(requested_reviewer.login);
        if (userEmail != null) {
          if (this.isEngXpSquad) {
            await this.jira.addReviewer(issueId, userEmail);
          } else {
            await this.jira.assignIssueToEmail(issueId, userEmail);
          }
        }
      }
    }
  }

  protected async addJiraComponent(issueId: string, name: string, description: string): Promise<void> {
    if (!await this.jira.createComponent(issueId.split('-')[0], name, description)) {   // Same PR can have multiple issues from different projects
      this.setFailed('Failed to create component');
    }
    if (!await this.jira.addIssueComponent(issueId, name)) {
      this.setFailed('Failed to add component');
    }
  }

}
