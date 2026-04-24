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

import * as core from '@actions/core';
import * as github from '@actions/github';
import type { Api } from '@octokit/plugin-rest-endpoint-methods';
import { Action } from './Action.js';
import { PullRequest, IssueComment, addPullRequestExtensions, Issue } from './OctokitTypes.js';
import { graphql, GraphQlQueryResponseData, GraphqlResponseError } from '@octokit/graphql';
import { JiraClient } from './JiraClient.js';
import { JIRA_ISSUE_PATTERN, RENOVATE_PREFIX, JIRA_SITE_ID, JIRA_ORGANIZATION_ID, JIRA_DOMAIN } from './Constants.js';

type VerifiedEmailsUser = {
  organizationVerifiedDomainEmails: string[];
}

type VerifiedEmailsResponse = {
  user: VerifiedEmailsUser;
}

export abstract class OctokitAction extends Action {
  public readonly rest: Api['rest'];
  protected readonly octokit: ReturnType<typeof github.getOctokit>;
  protected readonly jira: JiraClient;
  protected readonly isEngXpSquad: boolean;
  private graphqlWithAuth: typeof graphql | null = null;

  constructor() {
    super();
    this.jira = new JiraClient(JIRA_DOMAIN, JIRA_SITE_ID, JIRA_ORGANIZATION_ID, this.inputString('jira-user'), this.inputString('jira-token'));
    this.octokit = github.getOctokit(this.inputString('github-token'));
    this.rest = this.octokit.rest;
    this.isEngXpSquad = this.inputBoolean('is-eng-xp-squad');
  }

  public sendGraphQL<T = GraphQlQueryResponseData>(query: string): Promise<T> {
    this.graphqlWithAuth ??= graphql.defaults({
      headers: {
        authorization: `token ${this.inputString('github-token')}`,
      },
    });
    return this.graphqlWithAuth<T>(query);
  }

  protected inputString(name: string): string {
    return core.getInput(name);
  }

  protected inputNumber(name: string): number {
    const input = this.inputString(name);
    const value = parseInt(input);
    if (isNaN(value)) {
      throw new Error(`Value of input '${name}' is not a number: ${input}`);
    } else {
      return value;
    }
  }

  protected inputBoolean(name: string): boolean {
    return this.inputString(name).toLowerCase() === 'true';
  }

  protected async loadPullRequest(pull_number: number): Promise<PullRequest | null> {
    try {
      this.log(`Loading PR #${pull_number}`);
      return addPullRequestExtensions((await this.rest.pulls.get(this.addRepo({ pull_number }))).data);
    } catch (error) {
      this.log(`Pull Request #${pull_number} not found: ${error}`);
      return null;
    }
  }

  protected async loadIssue(issue_number: number): Promise<Issue | null> {
    try {
      this.log(`Loading issue #${issue_number}`);
      return (await this.rest.issues.get(this.addRepo({ issue_number }))).data;
    } catch (error) {
      this.log(`Issue #${issue_number} not found: ${error}`);
      return null;
    }
  }

  protected async findFixedIssues(pr: PullRequest): Promise<string[] | null> {
    const text = pr.isRenovate() // We're storing the ID in a comment as a workaround for https://github.com/renovatebot/renovate/issues/26833
      ? (await this.listComments(pr.number)).findLast(x => x.body?.startsWith(RENOVATE_PREFIX))?.body
      : pr.title;
    return text?.match(JIRA_ISSUE_PATTERN) ?? null;
  }

  protected async addComment(issue_number: number, body: string): Promise<void> {
    await this.rest.issues.createComment(this.addRepo({ issue_number, body }));
  }

  protected async listComments(issue_number: number): Promise<IssueComment[]> {
    return (await this.rest.issues.listComments(this.addRepo({ issue_number }))).data;
  }

  protected updateIssueTitle(issue_number: number, title: string): Promise<void> {
    this.log(`Updating issue #${issue_number} title to: ${title}`);
    return this.updateIssue(issue_number, { title });
  }

  protected updatePullRequestTitle(prNumber: number, title: string): Promise<void> {
    this.log(`Updating PR #${prNumber} title to: ${title}`);
    return this.updatePullRequest(prNumber, { title });
  }

  protected updatePullRequestDescription(prNumber: number, body: string): Promise<void> {
    this.log(`Updating PR #${prNumber} description`);
    return this.updatePullRequest(prNumber, { body });
  }

  private async updateIssue(issue_number: number, update: { title?: string, body?: string }): Promise<void> {
    try {
      await this.rest.issues.update(this.addRepo({ issue_number, ...update }));
    } catch (error) {
      this.log(`Failed to update issue #${issue_number}: ${error}`);
    }
  }

  private async updatePullRequest(prNumber: number, update: { title?: string, body?: string }): Promise<void> {
    try {
      await this.rest.pulls.update(this.addRepo({ pull_number: prNumber, ...update }));
    } catch (error) {
      this.log(`Failed to update PR #${prNumber}: ${error}`);
    }
  }

  protected async findEmail(login: string): Promise<string | null> {
    this.log(`Searching for email of ${login}`);
    try {
      const { user: { organizationVerifiedDomainEmails: emails } } = await this.sendGraphQL<VerifiedEmailsResponse>(`
        query {
          user(login: "${login}") {
            organizationVerifiedDomainEmails(login: "${this.repo.owner}")
          }
        }`);
      this.log(`Found ${emails.length} email(s) for ${login}`);
      return emails.find(x => x.toLowerCase().includes('@sonar')) ?? emails[0] ?? null;
    } catch (error) {
      if (error instanceof GraphqlResponseError && error.errors?.length === 1 && error.errors[0].type === 'NOT_FOUND') {
        this.log(`No email found for ${login}: ${error.errors[0].message}`);
        return null;
      }
      throw error;
    }
  }

  protected async sendSlackMessage(text: string): Promise<void> {
    const channel = this.inputString("slack-channel");
    if (channel) {
      this.log("Sending Slack message");
      await this.sendSlackPost("https://slack.com/api/chat.postMessage", { channel, text });
    } else {
      this.log("Skip sending slack message, channel was not set.")
    }
  }

  protected async sendSlackPost(url: string, jsonRequest: any): Promise<any> {
    const token = this.inputString("slack-token");
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
      this.log((ex as Error).toString());
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

  protected async addJiraComponent(issueId: string, name: string, description: string | null = null): Promise<void> {
    if (!await this.jira.createComponent(issueId.split('-')[0], name, description)) {   // Same PR can have multiple issues from different projects
      this.setFailed('Failed to create component');
      return;
    }
    if (!await this.jira.addIssueComponent(issueId, name)) {
      this.setFailed('Failed to add component');
    }
  }
}
