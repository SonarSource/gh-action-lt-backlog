import * as core from "@actions/core";
import * as github from "@actions/github";
import { GitHub } from "@actions/github/lib/utils";
import { Action } from "./Action";
import { RestEndpointMethods } from "@octokit/plugin-rest-endpoint-methods/dist-types/generated/method-types";

export abstract class OctokitAction extends Action {
    protected readonly octokit: InstanceType<typeof GitHub>;
    protected readonly rest: RestEndpointMethods;

    constructor() {
        super();
        this.octokit = github.getOctokit(core.getInput("github-token"));
        this.rest = this.octokit.rest;
    }
}