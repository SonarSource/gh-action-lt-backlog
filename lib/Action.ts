import * as core from '@actions/core';
import * as github from '@actions/github';
import { Context } from '@actions/github/lib/context';
import { WebhookPayload } from '@actions/github/lib/interfaces';

export type Repo = {
  owner: string;
  repo: string;
};

export abstract class Action {
  public readonly repo: Repo;
  protected readonly context: Context;
  protected readonly payload: WebhookPayload;

  protected abstract execute(): Promise<void>;

  public constructor() {
    this.context = github.context;
    this.repo = github.context.repo;
    this.payload = github.context.payload;
  }

  public async run(): Promise<void> {
    try {
      await this.execute();
      this.log('Done');
    } catch (ex) {
      core.setFailed(ex.message);
    }
  }

  public log(line: string) {
    console.log(line);
  }

  public logSerialized(value: any) {
    console.log(this.serializeToString(value));
  }

  public addRepo<T>(other: T): T & Repo {
    return { ...this.repo, ...other };
  }

  protected setFailed(message: string) {
    core.setFailed(`Action failed: ${message}`);
  }

  private serializeToString(value: any): string {
    return JSON.stringify(value, undefined, 2);
  }
}
