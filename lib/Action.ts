/*
 * Backlog Automation
 * Copyright (C) 2022-2025 SonarSource Sàrl
 * mailto: info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 3 of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with this program; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
 */

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
      console.log();
      console.log(ex.stack);
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
