"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OctokitAction = void 0;
const core = require("@actions/core");
const github = require("@actions/github");
const Action_1 = require("./Action");
const OctokitTypes_1 = require("./OctokitTypes");
const graphql_1 = require("@octokit/graphql");
const JiraClient_1 = require("./JiraClient");
const Constants_1 = require("./Constants");
class OctokitAction extends Action_1.Action {
    rest;
    octokit;
    jira;
    isEngXpSquad;
    graphqlWithAuth;
    constructor() {
        super();
        this.jira = new JiraClient_1.JiraClient(Constants_1.JIRA_DOMAIN, Constants_1.JIRA_SITE_ID, Constants_1.JIRA_ORGANIZATION_ID, this.inputString('jira-user'), this.inputString('jira-token'));
        this.octokit = github.getOctokit(this.inputString('github-token'));
        this.rest = this.octokit.rest;
        this.isEngXpSquad = this.inputBoolean('is-eng-xp-squad');
    }
    sendGraphQL(query) {
        if (!this.graphqlWithAuth) {
            this.graphqlWithAuth = graphql_1.graphql.defaults({
                headers: {
                    authorization: `token ${this.inputString('github-token')}`,
                },
            });
        }
        return this.graphqlWithAuth(query);
    }
    inputString(name) {
        return core.getInput(name);
    }
    inputNumber(name) {
        const input = this.inputString(name);
        const value = parseInt(input);
        if (isNaN(value)) {
            throw new Error(`Value of input '${name}' is not a number: ${input}`);
        }
        else {
            return value;
        }
    }
    inputBoolean(name) {
        return this.inputString(name).toLowerCase() === 'true';
    }
    async loadPullRequest(pull_number) {
        try {
            this.log(`Loading PR #${pull_number}`);
            return (0, OctokitTypes_1.addPullRequestExtensions)((await this.rest.pulls.get(this.addRepo({ pull_number }))).data);
        }
        catch (error) {
            this.log(`Pull Request #${pull_number} not found: ${error}`);
            return null;
        }
    }
    async loadIssue(issue_number) {
        try {
            this.log(`Loading issue #${issue_number}`);
            return (await this.rest.issues.get(this.addRepo({ issue_number }))).data;
        }
        catch (error) {
            this.log(`Issue #${issue_number} not found: ${error}`);
            return null;
        }
    }
    async findFixedIssues(pr) {
        const text = pr.isRenovate() // We're storing the ID in a comment as a workaround for https://github.com/renovatebot/renovate/issues/26833
            ? (await this.listComments(pr.number)).filter(x => x.body?.startsWith(Constants_1.RENOVATE_PREFIX)).pop()?.body
            : pr.title;
        return text?.match(Constants_1.JIRA_ISSUE_PATTERN) ?? null;
    }
    async addComment(issue_number, body) {
        await this.rest.issues.createComment(this.addRepo({ issue_number, body }));
    }
    async listComments(issue_number) {
        return (await this.rest.issues.listComments(this.addRepo({ issue_number }))).data;
    }
    updateIssueTitle(issue_number, title) {
        this.log(`Updating issue #${issue_number} title to: ${title}`);
        return this.updateIssue(issue_number, { title });
    }
    updatePullRequestTitle(prNumber, title) {
        this.log(`Updating PR #${prNumber} title to: ${title}`);
        return this.updatePullRequest(prNumber, { title });
    }
    updatePullRequestDescription(prNumber, body) {
        this.log(`Updating PR #${prNumber} description`);
        return this.updatePullRequest(prNumber, { body });
    }
    async updateIssue(issue_number, update) {
        try {
            await this.rest.issues.update(this.addRepo({ issue_number, ...update }));
        }
        catch (error) {
            this.log(`Failed to update issue #${issue_number}: ${error}`);
        }
    }
    async updatePullRequest(prNumber, update) {
        try {
            await this.rest.pulls.update(this.addRepo({ pull_number: prNumber, ...update }));
        }
        catch (error) {
            this.log(`Failed to update PR #${prNumber}: ${error}`);
        }
    }
    async findEmail(login) {
        this.log(`Searching for SAML identity of ${login}`);
        const identities = await this.findExternalIdentities(login);
        if (identities.length === 0) {
            this.log(`No SAML identity found for ${login}`);
            return null;
        }
        return identities[0].samlIdentity.nameId;
    }
    async findExternalIdentities(login) {
        const { organization: { samlIdentityProvider, }, } = await this.sendGraphQL(`
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
        }
        else {
            this.log('ERROR: Provided GitHub token does not have permissions to query organization/samlIdentityProvider/externalIdentities.');
            return [];
        }
    }
    async sendSlackMessage(text) {
        const channel = this.inputString("slack-channel");
        if (channel) {
            this.log("Sending Slack message");
            await this.sendSlackPost("https://slack.com/api/chat.postMessage", { channel, text });
        }
        else {
            this.log("Skip sending slack message, channel was not set.");
        }
    }
    async sendSlackPost(url, jsonRequest) {
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
        }
        catch (ex) {
            this.log("Failed to send Slack request");
            this.log(ex);
            return null;
        }
    }
    async processRequestReview(issueId, requested_reviewer) {
        if (requested_reviewer?.type === "Bot") {
            this.log(`Skipping request review from bot: ${requested_reviewer.login}`);
        }
        else {
            await this.jira.moveIssue(issueId, 'Request Review');
            if (requested_reviewer) {
                const userEmail = await this.findEmail(requested_reviewer.login);
                if (userEmail != null) {
                    if (this.isEngXpSquad) {
                        await this.jira.addReviewer(issueId, userEmail);
                    }
                    else {
                        await this.jira.assignIssueToEmail(issueId, userEmail);
                    }
                }
            }
        }
    }
    async addJiraComponent(issueId, name, description = null) {
        if (!await this.jira.createComponent(issueId.split('-')[0], name, description)) { // Same PR can have multiple issues from different projects
            this.setFailed('Failed to create component');
        }
        if (!await this.jira.addIssueComponent(issueId, name)) {
            this.setFailed('Failed to add component');
        }
    }
}
exports.OctokitAction = OctokitAction;
//# sourceMappingURL=OctokitAction.js.map