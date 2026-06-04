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
import { PullRequest, IssueComment, addPullRequestExtensions, Issue, SimpleUser } from './OctokitTypes.js';
import { graphql, GraphQlQueryResponseData, GraphqlResponseError } from '@octokit/graphql';
import { JiraClient } from './JiraClient.js';
import { JIRA_ISSUE_PATTERN, RENOVATE_PREFIX, JIRA_SITE_ID, JIRA_ORGANIZATION_ID, JIRA_DOMAIN, TEAM_REVIEW_PREFIX } from './Constants.js';
import { NewIssueData } from './NewIssueData.js';
import type { TeamReviewData } from './TeamReviewData.js';

type VerifiedEmailsUser = {
  organizationVerifiedDomainEmails: string[];
}

type VerifiedEmailsResponse = {
  user: VerifiedEmailsUser;
}

type RootlyScheduleSearchResponse = {
  data: {
    id: string
  }[];
}

type RootlyScheduleShiftsResponse = {
  included: {
    type: string,
    attributes: {
      email: string
    }
  }[]
}

export abstract class OctokitAction extends Action {
  public readonly rest: Api['rest'];
  public readonly jira: JiraClient;
  protected readonly octokit: ReturnType<typeof github.getOctokit>;
  protected readonly isEngXpSquad: boolean;
  private graphqlWithAuth: typeof graphql | null = null;
  private senderAccountId: string | null | undefined = undefined;   // Cache
  private readonly teamMembersCache = new Map<string, SimpleUser[]>();

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
    const value = Number.parseInt(input);
    if (Number.isNaN(value)) {
      throw new TypeError(`Value of input '${name}' is not a number: ${input}`);
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

  public async listTeamMembers(teamSlug: string): Promise<SimpleUser[]> {
    let members = this.teamMembersCache.get(teamSlug);
    if (!members) {
      this.log(`Loading members of ${teamSlug}`);
      members = (await this.rest.teams.listMembersInOrg({ org: this.repo.owner, team_slug: teamSlug, per_page: 100 })).data;  // We don't need to paginate, 100 is more than enough (for now)
      this.teamMembersCache.set(teamSlug, members);
    }
    return members;
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

  protected async findEmails(login: string): Promise<string[]> {
    this.log(`Searching for email of ${login}`);
    try {
      const { user: { organizationVerifiedDomainEmails: emails } } = await this.sendGraphQL<VerifiedEmailsResponse>(`
        query {
          user(login: "${login}") {
            organizationVerifiedDomainEmails(login: "${this.repo.owner}")
          }
        }`);
      this.log(`Found ${emails.length} email(s) for ${login}`);
      const sonar = emails.filter((x: string) => x.toLowerCase().includes('@sonar'));
      const other = emails.filter((x: string) => !x.toLowerCase().includes('@sonar'));
      return [...sonar, ...other];
    } catch (error) {
      if (error instanceof GraphqlResponseError && error.errors?.length === 1 && error.errors[0].type === 'NOT_FOUND') {
        this.log(`No email found for ${login}: ${error.errors[0].message}`);
        return [];
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

  public async findRootlyOnCallEmails(scheduleId: string): Promise<string[]> {
    this.log(`Finding Rootly On-Call email for schedule: ${scheduleId}`);
    const response = await this.sendRootlyGet<RootlyScheduleShiftsResponse>(`schedules/${scheduleId}/shifts?include=user`);
    const emails = response?.included.filter(x => x.type === 'users').map(x => x.attributes.email) || [];
    this.log(`Found ${emails.length} Rootly On-Call users`);  // Do not leak email addresses into logs
    return emails;
  }

  private async sendRootlyGet<T>(path: string): Promise<T | null> {
    const token = this.inputString('rootly-token');
    if (!token) {
      this.log('rootly-token was not set, request can not be send');
      return null;
    }
    try {
      const response = await fetch(`https://api.rootly.com/v1/${path}`, {
        headers: { authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        this.log(`Rootly request failed. Error ${response.status}: ${response.statusText}`);
        return null;
      }
      return await response.json() as T;
    } catch (ex) {
      this.log('Failed to send Rootly request');
      this.log((ex as Error).toString());
      return null;
    }
  }

  protected async processRequestReview(pr: PullRequest, issueId: string, component: string, requested_reviewer: SimpleUser | null, teamReview: TeamReviewData | null): Promise<void> {
    if (requested_reviewer?.type === "Bot") {
      this.log(`Skipping request review from bot: ${requested_reviewer.login}`);
    } else if (requested_reviewer || teamReview) { // Draft PR creation or PR without reviewers can have both null => NO OP
      await this.jira.moveIssue(issueId, 'Request Review');
      if (requested_reviewer) {
        const userEmails = await this.findEmails(requested_reviewer.login);
        if (this.isEngXpSquad) {
          await this.jira.addReviewer(issueId, userEmails);
        } else {
          await this.jira.assignIssueToEmail(issueId, userEmails);
        }
      }
      if (teamReview) {
        const data = await NewIssueData.createForTeamReview(this.jira, teamReview);
        this.log(`Creating ${data.projectKey} review issue`);
        const reviewIssueId = await this.jira.createIssue(data.projectKey, `PR review for ${pr.title}`, data.additionalFields);
        if (reviewIssueId) {
          if (data.assigneeId) {
            await this.jira.assignIssueToAccount(reviewIssueId, data.assigneeId);
          }
          await this.jira.addIssueRemoteLink(reviewIssueId, pr.html_url);
          await this.jira.linkIssues(reviewIssueId, issueId, 'Relates');
          await this.addComment(pr.number, `${TEAM_REVIEW_PREFIX}${this.issueLink(reviewIssueId)} ${teamReview.gitHubTeam.name}\n<!--slug: ${teamReview.gitHubTeam.slug} -->`); // SubmitReview depends on format of this comment
          await this.addJiraComponent(reviewIssueId, component);
        }
      }
    }
  }

  protected async addJiraComponent(issueId: string, name: string, description: string | null = null): Promise<void> {
    if (name) {
      if (!await this.jira.createComponent(issueId.split('-')[0], name, description)) {   // Same PR can have multiple issues from different projects
        this.setFailed('Failed to create component');
        return;
      }
      if (!await this.jira.addIssueComponent(issueId, name)) {
        this.setFailed('Failed to add component');
      }
    }
  }

  public async loadSenderAccountId(): Promise<string | null> {
    if (this.senderAccountId === undefined) {
      this.senderAccountId = await this.jira.findAccountId(await this.findEmails(this.payload.sender?.login));
    }
    return this.senderAccountId;
  }

  protected issueLink(issue: string): string {
    return `[${issue}](${JIRA_DOMAIN}/browse/${issue})`;
  }
}
