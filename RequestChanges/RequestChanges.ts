import fetch from 'node-fetch';
import { OctokitAction } from '../lib/OctokitAction';

const jiraDomain = 'https://sonarsource-sandbox-608.atlassian.net';

class RequestChanges extends OctokitAction {
  
  private readonly TRANSITION_NAME: string = 'Request Changes';
  private readonly auth: string;

  constructor() {
    super();
    const jiraApiToken = this.getInput('jira-token');

    this.auth = Buffer.from(jiraApiToken).toString('base64');
  }

  protected async execute(): Promise<void> {
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

  private async getJiraIssueIdsLinkToPr(): Promise<string[]> {
    let pullRequest = await this.getPullRequest(this.payload.pull_request.number);
    return pullRequest.title.match(/[A-Z]+-\d+/g) || [];
  }

  private async getTransitionId(issueId: string): Promise<string | null> {
    const url = `${jiraDomain}/rest/api/3/issue/${issueId}/transitions`;

    try {
      const response = await fetch(url, {
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
      const transition = data.transitions.find((t: any) => t.name === this.TRANSITION_NAME);
      if (transition == null) {
        console.warn(`${issueId}: Could not find the tranistion '${this.TRANSITION_NAME}'`);
      }
      return transition ? transition.id : null;
    } catch (error) {
      console.error(`${issueId}:`, error);
    }
  }

  private async changeIssueState(issueId: string, transitionId: string) {
    const url = `${jiraDomain}/rest/api/3/issue/${issueId}/transitions`;

    try {
      const response = await fetch(url, {
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
    } catch (error) {
      console.error('Error changing issue state:', error);
      throw error;
    }
  }
}

const action = new RequestChanges();
action.run();
