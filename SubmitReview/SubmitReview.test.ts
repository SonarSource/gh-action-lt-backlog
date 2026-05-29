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

async function runAction(state: string, findEmailsResult: string[] = [], prAuthor: string = "test-user", title: string = "GHA-42 and GHA-43 are processed", sender: string = "test-user", listCommentsResult: any[] = []) {
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
      login: sender,
      type: "User"
    }
  };
  const action = new SubmitReview() as SubmitReview & OctokitActionStub;
  action.jira = jiraClientStub;
  action.rest = createOctokitRestStub(title, null, prAuthor);
  action.findEmails = async function (login: string): Promise<string[]> {
    return findEmailsResult;
  };
  (action.rest.issues as any).listComments = function (params: any): any {
    console.log(`Invoked rest.issues.listComments(${JSON.stringify(params)})`);
    return { data: listCommentsResult }
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
      "Invoked rest.issues.listComments({\"owner\":\"test-owner\",\"repo\":\"test-repo\",\"issue_number\":42})",
      "Done",
    ]);
  });

  describe('Approved move issue and assign', async () => {
    it('bot', async () => {
      await runAction('approved', ['user@sonarsource.com'], 'dependabot[bot]', 'SUBMIT-1 Issue without assignee');
      expect(logTester.logsParams).toStrictEqual([
        "Loading PR #42",
        "Invoked jira.assignIssueToEmail('SUBMIT-1', ['user@sonarsource.com'])",
        "Invoked jira.moveIssue('SUBMIT-1', 'Approve', null)",
        "Invoked rest.issues.listComments({\"owner\":\"test-owner\",\"repo\":\"test-repo\",\"issue_number\":42})",
        "Done",
      ]);
    });

    it('bot - unknown email', async () => {
      await runAction('approved', [], 'dependabot[bot]', 'SUBMIT-1 Issue without assignee');
      expect(logTester.logsParams).toStrictEqual([
        "Loading PR #42",
        "Invoked jira.assignIssueToEmail('SUBMIT-1', [])",
        "Invoked jira.moveIssue('SUBMIT-1', 'Approve', null)",
        "Invoked rest.issues.listComments({\"owner\":\"test-owner\",\"repo\":\"test-repo\",\"issue_number\":42})",
        "Done",
      ]);
    });

    it('bot - had assignee', async () => {
      await runAction('approved', ['user@sonarsource.com'], 'dependabot[bot]', 'SUBMIT-2 Issue with assignee not re-assigned');
      expect(logTester.logsParams).toStrictEqual([
        "Loading PR #42",
        "Invoked jira.moveIssue('SUBMIT-2', 'Approve', null)",
        "Invoked rest.issues.listComments({\"owner\":\"test-owner\",\"repo\":\"test-repo\",\"issue_number\":42})",
        "Done",
      ]);
    });

    it('bot - was assigned to Nigel', async () => {
      await runAction('approved', ['user@sonarsource.com'], 'sonar-nigel[bot]', 'SUBMIT-3 Issue assigned to Nigel');
      expect(logTester.logsParams).toStrictEqual([
        "Loading PR #42",
        "Invoked jira.assignIssueToEmail('SUBMIT-3', ['user@sonarsource.com'])",
        "Invoked jira.moveIssue('SUBMIT-3', 'Approve', null)",
        "Invoked rest.issues.listComments({\"owner\":\"test-owner\",\"repo\":\"test-repo\",\"issue_number\":42})",
        "Done",
      ]);
    });
  });

  it('Approved is-eng-xp-squad adds ReviewedBy', async () => {
    process.env['INPUT_IS-ENG-XP-SQUAD'] = 'true';
    await runAction('approved', ['user@sonarsource.com']);
    expect(logTester.logsParams).toStrictEqual([
      "Loading PR #42",
      "Invoked jira.addReviewedBy('GHA-42', ['user@sonarsource.com'])",
      "Invoked jira.addReviewedBy('GHA-43', ['user@sonarsource.com'])",
      "Invoked rest.issues.listComments({\"owner\":\"test-owner\",\"repo\":\"test-repo\",\"issue_number\":42})",
      "Done",
    ]);
  });

  it('Approved is-eng-xp-squad unknown email', async () => {
    process.env['INPUT_IS-ENG-XP-SQUAD'] = 'true';
    await runAction('approved', []);
    expect(logTester.logsParams).toStrictEqual([
      "Loading PR #42",
      "Invoked jira.addReviewedBy('GHA-42', [])",
      "Invoked jira.addReviewedBy('GHA-43', [])",
      "Invoked rest.issues.listComments({\"owner\":\"test-owner\",\"repo\":\"test-repo\",\"issue_number\":42})",
      "Done",
    ]);
  });

  describe('Submitted with team review comment', async () => {
    const comments = [
      {},  // No body
      { body: '' },
      { body: 'Something else' },
      { body: 'Team Review Jira issue ID: [PREQ-4242](https://sonarsource.atlassian.net/browse/PREQ-4242) platform-cloud-eng-squad\\n<!--slug: platform-cloud-eng-squad -->' },
    ];

    it('Request changes by user from requested team', async () => {
      // first-login is member of OctokitRestStub.teams.listMembersInOrg, so it's a member of the team that was requested for review
      await runAction('changes_requested', ['user@sonarsource.com'], 'test-user', 'GHA-42 and GHA-43 are processed', 'first-login', comments);
      expect(logTester.logsParams).toStrictEqual([
        "Loading PR #42",
        "Invoked jira.moveIssue('GHA-42', 'Request Changes', null)",
        "Invoked jira.moveIssue('GHA-43', 'Request Changes', null)",
        "Done",
      ]);
    });

    it('Approved by user from requested team', async () => {
      // first-login is member of OctokitRestStub.teams.listMembersInOrg, so it's a member of the team that was requested for review
      await runAction('approved', ['user@sonarsource.com'], 'test-user', 'GHA-42 and GHA-43 are processed', 'first-login', comments);
      expect(logTester.logsParams).toStrictEqual([
        "Loading PR #42",
        "Invoked jira.moveIssue('GHA-42', 'Approve', null)",
        "Invoked jira.moveIssue('GHA-43', 'Approve', null)",
        "Invoked rest.issues.listComments({\"owner\":\"test-owner\",\"repo\":\"test-repo\",\"issue_number\":42})",
        "Loading members of platform-cloud-eng-squad",
        "Invoked rest.teams.listMembersInOrg({\"org\":\"test-owner\",\"team_slug\":\"platform-cloud-eng-squad\",\"per_page\":100})",
        "Invoked jira.moveIssue('PREQ-4242', 'Resolve issue', null)",
        "Invoked jira.moveIssue('PREQ-4242', 'Close Issue', null)",
        "Done",
      ]);
    });

    it('Approved by user from another team', async () => {
      await runAction('approved', ['user@sonarsource.com'], 'test-user', 'GHA-42 and GHA-43 are processed', 'another-login', comments);
      expect(logTester.logsParams).toStrictEqual([
        "Loading PR #42",
        "Invoked jira.moveIssue('GHA-42', 'Approve', null)",
        "Invoked jira.moveIssue('GHA-43', 'Approve', null)",
        "Invoked rest.issues.listComments({\"owner\":\"test-owner\",\"repo\":\"test-repo\",\"issue_number\":42})",
        "Loading members of platform-cloud-eng-squad",
        "Invoked rest.teams.listMembersInOrg({\"org\":\"test-owner\",\"team_slug\":\"platform-cloud-eng-squad\",\"per_page\":100})",
        "Done",
      ]);
    });
  });
});
