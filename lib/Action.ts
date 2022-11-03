import * as core from "@actions/core";
import * as github from "@actions/github";
import { Context } from "@actions/github/lib/context";
import { WebhookPayload } from "@actions/github/lib/interfaces";

export type Repo = {
    owner: string;
    repo: string;
}

export abstract class Action {
    protected readonly context: Context;
    protected readonly repo: Repo;
    protected readonly payload: WebhookPayload;

    protected abstract execute(): void;

    constructor() {
        this.context = github.context;
        this.repo = github.context.repo;
        this.payload = github.context.payload
    }

    run() {
        try {
            this.execute();
            this.log("Done");
        }
        catch (ex) {
            core.setFailed(ex.message);
        }
    }

    protected log(line: string) {
        console.log(line);
    }

    protected addRepo(other: any): any {
        return { ...this.repo, ...other };
    }

    protected serializeToString(value: any): string {
        return JSON.stringify(value, undefined, 2);
    }
}
