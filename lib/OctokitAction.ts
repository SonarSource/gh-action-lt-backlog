import * as core from "@actions/core";
import * as github from "@actions/github";
import { GitHub } from "@actions/github/lib/utils";
import { Action } from "./Action";
import { RestEndpointMethods } from "@octokit/plugin-rest-endpoint-methods/dist-types/generated/method-types";
import { components } from "@octokit/openapi-types/types.d";

export abstract class OctokitAction extends Action {
    protected readonly octokit: InstanceType<typeof GitHub>;
    protected readonly rest: RestEndpointMethods;

    constructor() {
        super();
        this.octokit = github.getOctokit(core.getInput("github-token"));
        this.rest = this.octokit.rest;
    }

    protected getInput(name: string): string {
        return core.getInput(name);
    }

    protected getInputNumber(name: string): number {
        const input = this.getInput(name);
        const value = parseInt(input);
        if (isNaN(value)) {
            throw new Error(`Value of input '${name}' is not a number: ${input}`)
        } else {
            return value;
        }
    }

    protected async downloadData(url: string): Promise<any> {
        console.log("Downloading " + url);
        return (await this.octokit.request(url)).data;
    }

    protected async addAssignee(issue: { number: number }, login: string): Promise<void> {
        console.log("Assigning to: " + login);
        await this.rest.issues.addAssignees(this.addRepo({
            issue_number: issue.number,
            assignees: [login]
        }));
    }

    protected async createCardIssue(issue: { id: number }, column_id: number): Promise<components["schemas"]["project-card"]> {
        return this.createCard(column_id, issue.id, "Issue");
    }

    protected async createCardPullRequest(pr: { id: number }, column_id: number): Promise<components["schemas"]["project-card"]> {
        return this.createCard(column_id, pr.id, "PullRequest");
    }

    private async createCard(column_id: number, content_id: number, content_type: string): Promise<components["schemas"]["project-card"]> {
        if (column_id === 0) {
            this.log(`Skip creating ${content_type} card.`);
        } else {
            this.log(`Creating ${content_type} card`);
            return (await this.rest.projects.createCard({ column_id, content_id, content_type })).data;            
        }
    }
}