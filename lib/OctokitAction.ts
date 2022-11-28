import * as core from "@actions/core";
import * as github from "@actions/github";
import { GitHub } from "@actions/github/lib/utils";
import { Action } from "./Action";
import { RestEndpointMethods } from "@octokit/plugin-rest-endpoint-methods/dist-types/generated/method-types";
import { IssueOrPR } from "./IssueOrPR";
import { Issue, ProjectCard, PullRequest } from "./OctokitTypes";

export abstract class OctokitAction extends Action {

    protected readonly octokit: InstanceType<typeof GitHub>;
    public readonly rest: RestEndpointMethods;

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

    protected getInputBoolean(name: string): boolean {
        return this.getInput(name).toLowerCase() == "true";
    }

    public async downloadData(url: string): Promise<any> {
        console.log("Downloading " + url);
        return (await this.octokit.request(url)).data;
    }

    protected async getIssue(issue_number: number): Promise<Issue> {
        try {
            this.log(`Getting issue #${issue_number}`);
            return (await this.rest.issues.get(this.addRepo({ issue_number }))).data;
        }
        catch (error) {
            this.log(`Issue #${issue_number} not found: ${error}`);
            return null;
        }
    }

    protected async getPullRequest(pull_number: number): Promise<PullRequest> {
        try {
            this.log(`Getting PR #${pull_number}`);
            return (await this.rest.pulls.get(this.addRepo({ pull_number }))).data;
        }
        catch (error) {
            this.log(`Pull Request #${pull_number} not found: ${error}`);
            return null;
        }
    }

    protected async addAssignee(issue: { number: number }, login: string): Promise<void> {
        console.log("Assigning to: " + login);
        await this.rest.issues.addAssignees(this.addRepo({
            issue_number: issue.number,
            assignees: [login]
        }));
    }

    protected async removeAssignees(issue): Promise<void> {
        const oldAssignees = issue.assignees.map(x => x.login);
        if (oldAssignees.length !== 0) {
            console.log("Removing assignees: " + oldAssignees.join(", "));
            await this.rest.issues.removeAssignees(this.addRepo({
                issue_number: issue.number,
                assignees: oldAssignees
            }));
        }
    }

    protected async reassignIssue(issue: { number: number }, login: string): Promise<void> {
        await this.removeAssignees(issue);
        await this.addAssignee(issue, login);
    }

    protected fixedIssues(pr: { body?: string }): number[] {
        const matches = pr.body?.match(/(close|closes|closed|fix|fixes|fixed|resolve|resolves|resolved)\s*#\d+/gi);
        return matches ? matches.map(x => parseInt(x.split("#")[1])) : [];
    }

    public async createCard(issueOrPR: IssueOrPR, column_id: number): Promise<ProjectCard> {
        const content_type = issueOrPR.url.indexOf("/pulls/") < 0 ? "Issue" : "PullRequest";
        const content_id = issueOrPR.id;
        if (column_id === 0) {
            this.log(`Skip creating ${content_type} card for #${issueOrPR.number}.`);
        } else {
            this.log(`Creating ${content_type} card for #${issueOrPR.number}`);
            return (await this.rest.projects.createCard({ column_id, content_id, content_type })).data;
        }
    }
}
