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
          case 302: return create('closed', true);  // Merged
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
    await runAction('CLOSEDCLOSED-1');
    expect(logTester.logsParams).toStrictEqual([
      "Invoked jira.findIssues(...), returning CLOSEDCLOSED-1",
      "Found 1 issue(s) to check",
      "Loading PR #100",
      "https://github.com/test-owner/test-repo/pull/100: Closed",
      "Loading PR #101",
      "https://github.com/test-owner/test-repo/pull/101: Closed",
      "Invoked jira.moveIssue('CLOSEDCLOSED-1', 'Cancel Issue', {\"resolution\":{\"id\":\"10001\"}})",
      "Checked 1 issue(s): 1 Canceled, 0 marked as Done",
      "Done",
    ]);
  });

  it('Open and Closed PR', async () => {
    await runAction('CLOSEDOPENED-1');
    expect(logTester.logsParams).toStrictEqual([
      "Invoked jira.findIssues(...), returning CLOSEDOPENED-1",
      "Found 1 issue(s) to check",
      "Loading PR #100",
      "https://github.com/test-owner/test-repo/pull/100: Closed",
      "Loading PR #201",
      "https://github.com/test-owner/test-repo/pull/201: Open",
      "Checked 1 issue(s): 0 Canceled, 0 marked as Done",
      "Done",
    ]);
  });

  it('Closed and Merged PR', async () => {
    await runAction('CLOSEDMERGED-1');
    expect(logTester.logsParams).toStrictEqual([
      "Invoked jira.findIssues(...), returning CLOSEDMERGED-1",
      "Found 1 issue(s) to check",
      "Loading PR #100",
      "https://github.com/test-owner/test-repo/pull/100: Closed",
      "Loading PR #301",
      "https://github.com/test-owner/test-repo/pull/301: Merged",
      "Invoked jira.moveIssue('CLOSEDMERGED-1', 'Merge', null)",
      "Checked 1 issue(s): 0 Canceled, 1 marked as Done",
      "Done",
    ]);
  });

  it('Nonexistent PR', async () => {
    await runAction('CLOSEDMISSED-1');
    expect(logTester.logsParams).toStrictEqual([
      "Invoked jira.findIssues(...), returning CLOSEDMISSED-1",
      "Found 1 issue(s) to check",
      "Loading PR #100",
      "https://github.com/test-owner/test-repo/pull/100: Closed",
      "Loading PR #0",
      "Pull Request #0 not found: Error: PR #0 does not exist",
      "https://github.com/test-owner/test-repo/pull/0: Unknown",
      "Checked 1 issue(s): 0 Canceled, 0 marked as Done",
      "Done",
    ]);
  });

  it('Only merged PRs', async () => {
    await runAction('MERGEDMERGED-1');
    expect(logTester.logsParams).toStrictEqual([
      "Invoked jira.findIssues(...), returning MERGEDMERGED-1",
      "Found 1 issue(s) to check",
      "Loading PR #301",
      "https://github.com/test-owner/test-repo/pull/301: Merged",
      "Loading PR #302",
      "https://github.com/test-owner/test-repo/pull/302: Merged",
      "Invoked jira.moveIssue('MERGEDMERGED-1', 'Merge', null)",
      "Checked 1 issue(s): 0 Canceled, 1 marked as Done",
      "Done",
    ]);
  });

  it('Open and Merged PR', async () => {
    await runAction('MERGEDOPENED-1');
    expect(logTester.logsParams).toStrictEqual([
      "Invoked jira.findIssues(...), returning MERGEDOPENED-1",
      "Found 1 issue(s) to check",
      "Loading PR #301",
      "https://github.com/test-owner/test-repo/pull/301: Merged",
      "Loading PR #201",
      "https://github.com/test-owner/test-repo/pull/201: Open",
      "Checked 1 issue(s): 0 Canceled, 0 marked as Done",
      "Done",
    ]);
  });

  it('Ignore irrelevant links', async () => {
    await runAction('IRRELEVANT-1');
    expect(logTester.logsParams).toStrictEqual([
      "Invoked jira.findIssues(...), returning IRRELEVANT-1",
      "Found 1 issue(s) to check",
      "https://github.com/another-owner/test-repo/pull/100: From another repo",
      "https://github.com/test-owner/another-repo/pull/100: From another repo",
      "https://another-domain.com/test-owner/test-repo/pull/100: From another repo",
      "https://sonarsource.com: From another repo",
      "Checked 1 issue(s): 0 Canceled, 0 marked as Done",
      "Done",
    ]);
  });

  it('No PRs', async () => {
    await runAction('EMPTY-1');
    expect(logTester.logsParams).toStrictEqual([
      "Invoked jira.findIssues(...), returning EMPTY-1",
      "Found 1 issue(s) to check",
      "EMPTY-1: No pull request is linked, closing",
      "Invoked jira.moveIssue('EMPTY-1', 'Cancel Issue', {\"resolution\":{\"id\":\"10001\"}})",
      "Checked 1 issue(s): 1 Canceled, 0 marked as Done",
      "Done",
    ]);
  });

  it('Remote links failed to load', async () => {
    await runAction('FAILED-1');
    expect(logTester.logsParams).toStrictEqual([
      "Invoked jira.findIssues(...), returning FAILED-1",
      "Found 1 issue(s) to check",
      "FAILED-1: Remote links could not be loaded, skipping",
      "Checked 1 issue(s): 0 Canceled, 0 marked as Done",
      "Done",
    ]);
  });
});
