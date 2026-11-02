/*
 * Backlog Automation
 * Copyright (C) SonarSource Sàrl
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

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { CleanupIssues } from './CleanupIssues.js';
import { LogTester } from '../tests/LogTester.js';
import { OctokitActionStub } from '../tests/OctokitActionStub.js';
import type { Api } from '@octokit/plugin-rest-endpoint-methods';
import * as github from '@actions/github';
import { jiraClientStub } from '../tests/JiraClientStub.js';

async function runAction(issueId: string): Promise<void> {
  const action = new CleanupIssues() as unknown as OctokitActionStub & { run(): Promise<void> };
  action.jira = jiraClientStub;
  action.jira.findIssues = async (query: string) => {
    console.log(`Invoked jira.findIssues(...), returning ${issueId}`);
    return [{ key: issueId, fields: { summary: `Summary of ${issueId}` } }];
  };
  action.rest = {
    pulls: {
      async get({ pull_number }: { pull_number: number }) {
        function create(state: string, merged: boolean): any {
          return { data: { number: pull_number, state, merged } };
        }

        switch (pull_number) {
          case 0: throw new Error('PR #0 does not exist');
          case 100: return create('closed', false);
          case 101: return create('closed', false);
          case 201: return create('open', false);
          case 301: return create('closed', true);  // Merged
          default:
            throw new Error(`Scaffolding did not expect pull_number: ${pull_number}`);
        }
      }
    }
  } as unknown as Api['rest'];
  await action.run();
}

describe('CleanupIssues', () => {
  let logTester: LogTester;

  beforeEach(() => {
    logTester = new LogTester();
    process.env['GITHUB_REPOSITORY'] = 'test-owner/test-repo';
    process.env['INPUT_GITHUB-TOKEN'] = 'fake';
    process.env['INPUT_JIRA-USER'] = 'fake';
    process.env['INPUT_JIRA-TOKEN'] = 'fake';
    process.env['INPUT_JIRA-PROJECT'] = 'KEY';
    github.context.payload = {};
  });

  afterEach(() => {
    logTester?.afterEach(); // When beforeAll fails, beforeEach is not called, but afterEach is.
  });

  it('Only closed PRs', async () => {
    await runAction('CLOSED-1');
    expect(logTester.logsParams).toStrictEqual([
      "Invoked jira.findIssues(...), returning CLOSED-1",
      "Found 1 issue(s) to check",
      "Loading PR #100",
      "Loading PR #101",
      "Invoked jira.moveIssue('CLOSED-1', 'Cancel Issue', {\"resolution\":{\"id\":\"10001\"}})",
      "Cancelled 1 of 1 issue(s)",
      "Done",
    ]);
  });

  it('With open PR', async () => {
    await runAction('OPENED-1');
    expect(logTester.logsParams).toStrictEqual([
      "Invoked jira.findIssues(...), returning OPENED-1",
      "Found 1 issue(s) to check",
      "Loading PR #100",
      "Loading PR #201",
      "OPENED-1: PR #201 is open, skipping",
      "Cancelled 0 of 1 issue(s)",
      "Done",
    ]);
  });

  it('With merged PR', async () => {
    await runAction('MERGED-1');
    expect(logTester.logsParams).toStrictEqual([
      "Invoked jira.findIssues(...), returning MERGED-1",
      "Found 1 issue(s) to check",
      "Loading PR #100",
      "Loading PR #301",
      "MERGED-1: PR #301 is merged, skipping",
      "Cancelled 0 of 1 issue(s)",
      "Done",
    ]);
  });

  it('Nonexistent PR', async () => {
    await runAction('MISSED-1');
    expect(logTester.logsParams).toStrictEqual([
      "Invoked jira.findIssues(...), returning MISSED-1",
      "Found 1 issue(s) to check",
      "Loading PR #100",
      "Loading PR #0",
      "Pull Request #0 not found: Error: PR #0 does not exist",
      "MISSED-1: PR #0 not found, skipping",
      "Cancelled 0 of 1 issue(s)",
      "Done",
    ]);
  });

  it('Ignore irrelevant links', async () => {
    await runAction('IRRELEVANT-1');
    expect(logTester.logsParams).toStrictEqual([
      "Invoked jira.findIssues(...), returning IRRELEVANT-1",
      "Found 1 issue(s) to check",
      "IRRELEVANT-1: No pull request from this repository is linked, skipping",
      "Cancelled 0 of 1 issue(s)",
      "Done",
    ]);
  });

  it('No issues', async () => {
    await runAction('EMPTY-1');
    expect(logTester.logsParams).toStrictEqual([
      "Invoked jira.findIssues(...), returning EMPTY-1",
      "Found 1 issue(s) to check",
      "EMPTY-1: No pull request from this repository is linked, skipping",
      "Cancelled 0 of 1 issue(s)",
      "Done",
    ]);
  });
});
