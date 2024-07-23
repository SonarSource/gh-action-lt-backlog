"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_fetch_1 = require("node-fetch");
const OctokitAction_1 = require("../lib/OctokitAction");
const jiraDomain = 'https://sonarsource-sandbox-608.atlassian.net';
class RequestChanges extends OctokitAction_1.OctokitAction {
    constructor() {
        super();
        this.TRANSITION_NAME = 'Request Changes';
        const jiraApiToken = this.getInput('jira-token');
        this.auth = Buffer.from(jiraApiToken).toString('base64');
    }
    async execute() {
        const issueIds = await this.getJiraIssueIdsLinkToPr();
        if (issueIds.length === 0) {
            console.warn('No JIRA issue found in the PR title.');
        }
        for (const issueId of issueIds) {
            const transitionId = await this.getTransitionId(issueId);
            if (transitionId) {
                await this.changeIssueState(issueId, transitionId);
            }
        }
    }
    async getJiraIssueIdsLinkToPr() {
        let pullRequest = await this.getPullRequest(this.payload.pull_request.number);
        return pullRequest.title.match(/[A-Z]+-\d+/g) || [];
    }
    async getTransitionId(issueId) {
        const url = `${jiraDomain}/rest/api/3/issue/${issueId}/transitions`;
        try {
            const response = await (0, node_fetch_1.default)(url, {
                method: 'GET',
                headers: {
                    'Authorization': `Basic ${this.auth}`,
                    'Accept': 'application/json',
                },
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(`Failed to fetch transitions: ${data.errorMessages[0]}`);
            }
            console.log(response);
            console.log(data);
            const transition = data.transitions.find((t) => t.name === this.TRANSITION_NAME);
            if (transition == null) {
                console.warn(`${issueId}: Could not find the tranistion '${this.TRANSITION_NAME}'`);
            }
            return transition ? transition.id : null;
        }
        catch (error) {
            console.error(`${issueId}:`, error);
        }
    }
    async changeIssueState(issueId, transitionId) {
        const url = `${jiraDomain}/rest/api/3/issue/${issueId}/transitions`;
        try {
            const response = await (0, node_fetch_1.default)(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Basic ${this.auth}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    transition: { id: transitionId }
                }),
            });
            if (!response.ok) {
                throw new Error(`Failed to change issue state: ${response.statusText}`);
            }
            console.log(`${issueId}: Transition '${this.TRANSITION_NAME}' successfully excecuted.`);
        }
        catch (error) {
            console.error('Error changing issue state:', error);
            throw error;
        }
    }
}
const action = new RequestChanges();
action.run();
//# sourceMappingURL=RequestChanges.js.map