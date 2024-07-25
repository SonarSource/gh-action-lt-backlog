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
        this.jira = new JiraClient_1.JiraClient(core.getInput('jira-user'), core.getInput('jira-token'));
        this.octokit = github.getOctokit(core.getInput('github-token'));
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
    async moveIssue(issueId, transitionName) {
        const transition = await this.jira.findTransition(issueId, transitionName);
        if (transition != null) {
            await this.jira.transitionIssue(issueId, transition);
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
}
exports.OctokitAction = OctokitAction;
//# sourceMappingURL=OctokitAction.js.map