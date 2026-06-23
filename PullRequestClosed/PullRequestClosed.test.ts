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
import { PullRequestClosed } from './PullRequestClosed.js';
import { LogTester } from '../tests/LogTester.js';
import { jiraClientStub } from '../tests/JiraClientStub.js';
import { createOctokitRestStub } from '../tests/OctokitRestStub.js';
import { OctokitActionStub } from '../tests/OctokitActionStub.js';

async function runAction(title: string, merged: boolean, user: string = 'test-user', branchName: string = 'master') {
  process.env['INPUT_JIRA-PROJECT'] = 'KEY';
  const action = new PullRequestClosed() as PullRequestClosed & OctokitActionStub;
  action.jira = jiraClientStub;
  action.rest = createOctokitRestStub(title, null, user);
  action.payload.pull_request = {
    ...(await action.rest.pulls.get({} as any)).data,
    created_at: '2024-12-24T11:00:00Z',
    updated_at: '2024-12-24T22:33:44Z',  // Closing action can not be triggered at the same time as PR creation
    merged,
    base: { ref: branchName },
  } as typeof action.payload.pull_request;  // Reuse scaffolding
  if (user === "renovate[bot]") {
    (action as any).rest.issues.listComments = function () {
      return {
        data: [
          { body: "Renovate Jira issue ID: KEY-1234" }
        ]
      };
    };
  }
  await action.run();
}

describe('PullRequestClosed', () => {
  const originalKeys = Object.keys(process.env);
  let logTester: LogTester;

  beforeEach(() => {
    logTester = new LogTester();
    for (const key of Object.keys(process.env)) {
      if (!originalKeys.includes(key)) {
        // Otherwise, changes form previous UT are propagated to the next one
        delete process.env[key];
      }
    }
    process.env['GITHUB_REPOSITORY'] = 'test-owner/test-repo';
    process.env['INPUT_GITHUB-TOKEN'] = 'fake';
  });

  afterEach(() => {
    logTester?.afterEach(); // When beforeAll fails, beforeEach is not called, but afterEach is.
  });

  it('is-eng-xp-squad non-Bot PR skips issue resolution', async () => {
    process.env['INPUT_IS-ENG-XP-SQUAD'] = 'true';
    await runAction('KEY-1234 Title', true);
    expect(logTester.logsParams).toStrictEqual([
      "Loading PR #42",
      "Skipping issue resolution for non-Bot PR",
      "Done"
    ]);
  });

  it('is-eng-xp-squad PR moves issue to Done - renovate', async () => {
    process.env['INPUT_IS-ENG-XP-SQUAD'] = 'true';
    await runAction('Title', true, "renovate[bot]");
    expect(logTester.logsParams).toStrictEqual([
      "Loading PR #42",
      "Invoked jira.moveIssue('KEY-1234', 'Resolve issue', {\"resolution\":{\"id\":\"10000\"}})",
      "Done",
    ]);
  });

  it('is-eng-xp-squad PR moves issue to Done - dependabot', async () => {
    process.env['INPUT_IS-ENG-XP-SQUAD'] = 'true';
    await runAction('KEY-1234 Title', true, "dependabot[bot]");
    expect(logTester.logsParams).toStrictEqual([
      "Loading PR #42",
      "Invoked jira.moveIssue('KEY-1234', 'Resolve issue', {\"resolution\":{\"id\":\"10000\"}})",
      "Done",
    ]);
  });


  it('is-eng-xp-squad Bot PR unmerged PR cancels issue', async () => {
    process.env['INPUT_IS-ENG-XP-SQUAD'] = 'true';
    await runAction('Title', false, "renovate[bot]");
    expect(logTester.logsParams).toStrictEqual([
      "Loading PR #42",
      "Invoked jira.moveIssue('KEY-1234', 'Resolve issue', {\"resolution\":{\"id\":\"10001\"}})",
      "Done",
    ]);
  });

  it('Unmerged PR for ticket created by automation is closed', async () => {
    await runAction('KEY-5678 Title', false);
    expect(logTester.logsParams).toStrictEqual([
      "Loading PR #42",
      "Invoked jira.moveIssue('KEY-5678', 'Cancel Issue', {\"resolution\":{\"id\":\"10001\"}})",
      "Done"
    ]);
  });

  it('Unmerged PR for pre-existing issue is closed', async () => {
    await runAction('KEY-1234 Title', false);
    expect(logTester.logsParams).toStrictEqual([
      "Loading PR #42",
      "Skipping issue cancellation for creator Creator of KEY-1234",
      "Done"
    ]);
  });

  it('Jira issue does not exist', async () => {
    await runAction('FAKE-1234 Title', false);
    expect(logTester.logsParams).toStrictEqual([
      "Loading PR #42",
      "Skipping issue cancellation for creator null",
      "Done"
    ]);
  });

  it('PR merged into release branch', async () => {
    const releaseBranches = ['master', 'main', 'branch-0.0.0'];
    for (const branchName of releaseBranches) {
      await runAction('KEY-1234 Title', true, 'test-user', branchName);
      expect(logTester.logsParams).toStrictEqual([
        "Loading PR #42",
        "Invoked jira.transitionIssue('KEY-1234', {\"id\":\"10000\",\"name\":\"Merge into master\"}, null)",
        "Done",
      ]);
      logTester.logsParams = [];
    }
  });

  it('PR merged into non-release branch', async () => {
    await runAction('KEY-5678 Title', true, 'test-user', 'user/branch');
    expect(logTester.logsParams).toStrictEqual([
      "Loading PR #42",
      "Invoked jira.transitionIssue('KEY-5678', {\"id\":\"10001\",\"name\":\"Merge into branch\"}, null)",
      "Done",
    ]);
  });

  it('Merge PR for workflow without feature branches', async () => {
    await runAction('KEY-1111 Title', true);
    expect(logTester.logsParams).toStrictEqual([
      "Loading PR #42",
      "Invoked jira.moveIssue('KEY-1111', 'Merge', null)",
      "Done",
    ]);
  });

  it('sets fix version when configured on merge', async () => {
    process.env['INPUT_FIX-VERSION'] = '10.23';
    await runAction('KEY-1234 Title', true);
    expect(logTester.logsParams).toStrictEqual([
      "Loading PR #42",
      "Invoked jira.transitionIssue('KEY-1234', {\"id\":\"10000\",\"name\":\"Merge into master\"}, null)",
      "Invoked jira.addFixVersion('KEY-1234', '10.23')",
      "Done",
    ]);
  });

  it('skips fix version when already set', async () => {
    process.env['INPUT_FIX-VERSION'] = '10.23';
    await runAction('KEY-9001 Title', true);
    expect(logTester.logsParams).toStrictEqual([
      "Loading PR #42",
      "Invoked jira.transitionIssue('KEY-9001', {\"id\":\"10000\",\"name\":\"Merge into master\"}, null)",
      "KEY-9001: fix version already set (9.8), skipping",
      "Done",
    ]);
  });

  it('skips fix version when loading existing fix versions fails', async () => {
    process.env['INPUT_FIX-VERSION'] = '10.23';
    await runAction('KEY-9002 Title', true);
    expect(logTester.logsParams).toStrictEqual([
      "Loading PR #42",
      "Invoked jira.transitionIssue('KEY-9002', {\"id\":\"10000\",\"name\":\"Merge into master\"}, null)",
      "KEY-9002: Could not load fix versions, skipping fix version assignment",
      "Done",
    ]);
  });

  it('does not set fix version when input is empty', async () => {
    process.env['INPUT_FIX-VERSION'] = '';
    await runAction('KEY-1234 Title', true);
    expect(logTester.logsParams).toStrictEqual([
      "Loading PR #42",
      "Invoked jira.transitionIssue('KEY-1234', {\"id\":\"10000\",\"name\":\"Merge into master\"}, null)",
      "Done",
    ]);
  });

  it('does not set fix version when pull request is not merged', async () => {
    process.env['INPUT_FIX-VERSION'] = '10.23';
    await runAction('KEY-1234 Title', false);
    expect(logTester.logsParams).toStrictEqual([
      "Loading PR #42",
      "Skipping issue cancellation for creator Creator of KEY-1234",
      "Done",
    ]);
  });

  it('skips fix version when assignment fails', async () => {
    process.env['INPUT_FIX-VERSION'] = '10.23';
    await runAction('KEY-9003 Title', true);
    expect(logTester.logsParams).toStrictEqual([
      "Loading PR #42",
      "Invoked jira.transitionIssue('KEY-9003', {\"id\":\"10000\",\"name\":\"Merge into master\"}, null)",
      "KEY-9003: Could not set fix version 10.23, skipping fix version assignment",
      "Done",
    ]);
  });
});

