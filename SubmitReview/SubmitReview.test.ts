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
import * as github from '@actions/github';
import { LogTester } from '../tests/LogTester.js';
import { createOctokitRestStub } from '../tests/OctokitRestStub.js';
import { SubmitReview } from './SubmitReview.js';
import { jiraClientStub } from '../tests/JiraClientStub.js';
import { OctokitActionStub } from '../tests/OctokitActionStub.js';

async function runAction(state: string, findEmailResult: string | null = null, prAuthor: string = "test-user", title: string = "GHA-42 and GHA-43 are processed") {
  github.context.payload = {
    pull_request: {
      number: 42,
      title,
    },
    requested_reviewer: {
      login: "test-user",
      type: "User",
    },
    review: {
      state
    },
    sender: {
      login: 'test-user',
      type: "User"
    }
  };
  const action = new SubmitReview() as SubmitReview & OctokitActionStub;
  action.jira = jiraClientStub;
  action.rest = createOctokitRestStub(title, null, prAuthor);
  action.findEmail = async function (login: string): Promise<string | null> {
    return findEmailResult;
  };
  await action.run();
}

describe('SubmitReview', () => {
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

  it('Commented does nothing', async () => {
    await runAction('commented');
    expect(logTester.logsParams).toStrictEqual([
      "Loading PR #42",
      "Done",
    ]);
  });

  it('Request Changes moves issue', async () => {
    await runAction('changes_requested');
    expect(logTester.logsParams).toStrictEqual([
      "Loading PR #42",
      "Invoked jira.moveIssue('GHA-42', 'Request Changes', null)",
      "Invoked jira.moveIssue('GHA-43', 'Request Changes', null)",
      "Done",
    ]);
  });

  it('Approved moves issue', async () => {
    await runAction('approved');
    expect(logTester.logsParams).toStrictEqual([
      "Loading PR #42",
      "Invoked jira.moveIssue('GHA-42', 'Approve', null)",
      "Invoked jira.moveIssue('GHA-43', 'Approve', null)",
      "Done",
    ]);
  });

  it('Approved move issue and assign - bot', async () => {
    await runAction('approved', 'user@sonarsource.com', 'dependabot[bot]', 'SUBMIT-1 Issue without assignee');
    expect(logTester.logsParams).toStrictEqual([
      "Loading PR #42",
      "Invoked jira.assignIssueToEmail('SUBMIT-1', 'user@sonarsource.com')",
      "Invoked jira.moveIssue('SUBMIT-1', 'Approve', null)",
      "Done",
    ]);
  });

  it('Approved move issue and assign - bot - unknown email', async () => {
    await runAction('approved', null, 'dependabot[bot]', 'SUBMIT-1 Issue without assignee');
    expect(logTester.logsParams).toStrictEqual([
      "Loading PR #42",
      "Invoked jira.moveIssue('SUBMIT-1', 'Approve', null)",
      "Done",
    ]);
  });

  it('Approved move issue and assign - bot - had assignee', async () => {
    await runAction('approved', 'user@sonarsource.com', 'dependabot[bot]', 'SUBMIT-2 Issue with assignee not re-assigned');
    expect(logTester.logsParams).toStrictEqual([
      "Loading PR #42",
      "Invoked jira.moveIssue('SUBMIT-2', 'Approve', null)",
      "Done",
    ]);
  });

  it('Approved is-eng-xp-squad adds ReviewedBy', async () => {
    process.env['INPUT_IS-ENG-XP-SQUAD'] = 'true';
    await runAction('approved', 'user@sonarsource.com');
    expect(logTester.logsParams).toStrictEqual([
      "Loading PR #42",
      "Invoked jira.addReviewedBy('GHA-42', 'user@sonarsource.com')",
      "Invoked jira.addReviewedBy('GHA-43', 'user@sonarsource.com')",
      "Done",
    ]);
  });

  it('Approved is-eng-xp-squad unknown email', async () => {
    process.env['INPUT_IS-ENG-XP-SQUAD'] = 'true';
    await runAction('approved', null);
    expect(logTester.logsParams).toStrictEqual([
      "Loading PR #42",
      "Done",
    ]);
  });
});
