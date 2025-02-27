"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OctokitAction = void 0;
const core = require("@actions/core");
const github = require("@actions/github");
const Action_1 = require("./Action");
const node_fetch_1 = require("node-fetch");
const graphql_1 = require("@octokit/graphql");
const JiraClient_1 = require("./JiraClient");
class OctokitAction extends Action_1.Action {
    constructor() {
        super();
        this.jira = new JiraClient_1.JiraClient(this.getInput('jira-user'), this.getInput('jira-token'));
        this.octokit = github.getOctokit(this.getInput('github-token'));
        this.rest = this.octokit.rest;
    }
    sendGraphQL(query) {
        if (!this.graphqlWithAuth) {
            this.graphqlWithAuth = graphql_1.graphql.defaults({
                headers: {
                    authorization: `token ${this.getInput('github-token')}`,
                },
            });
        }
        return this.graphqlWithAuth(query);
    }
    getInput(name) {
        return core.getInput(name);
    }
    getInputNumber(name) {
        const input = this.getInput(name);
        const value = parseInt(input);
        if (isNaN(value)) {
            throw new Error(`Value of input '${name}' is not a number: ${input}`);
        }
        else {
            return value;
        }
    }
    getInputBoolean(name) {
        return this.getInput(name).toLowerCase() === 'true';
    }
    async getPullRequest(pull_number) {
        try {
            this.log(`Getting PR #${pull_number}`);
            return (await this.rest.pulls.get(this.addRepo({ pull_number }))).data;
        }
        catch (error) {
            this.log(`Pull Request #${pull_number} not found: ${error}`);
            return null;
        }
    }
    updatePullRequestTitle(prNumber, title) {
        this.log(`Updating PR #${prNumber} title to: ${title}`);
        return this.updatePullRequest(prNumber, { title });
    }
    updatePullRequestDescription(prNumber, body) {
        this.log(`Updating PR #${prNumber} description`);
        return this.updatePullRequest(prNumber, { body });
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
        const channel = this.getInput("slack-channel");
        if (channel) {
            this.log("Sending Slack message");
            await this.sendSlackPost("https://slack.com/api/chat.postMessage", { channel, text });
        }
        else {
            this.log("Skip sending slack message, channel was not set.");
        }
    }
    async sendSlackPost(url, jsonRequest) {
        const token = this.getInput("slack-token");
        if (!token) {
            throw new Error("slack-token was not set");
        }
        try {
            const body = JSON.stringify(jsonRequest);
            this.log(`Sending slack POST: ${body}`);
            const response = await (0, node_fetch_1.default)(url, {
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
        await this.jira.moveIssue(issueId, 'Request Review');
        if (requested_reviewer) {
            const userEmail = await this.findEmail(requested_reviewer.login);
            if (userEmail != null) {
                await this.jira.assignIssueToEmail(issueId, userEmail);
            }
        }
    }
}
exports.OctokitAction = OctokitAction;
//# sourceMappingURL=OctokitAction.js.map