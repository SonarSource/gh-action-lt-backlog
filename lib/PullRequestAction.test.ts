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

import * as github from '@actions/github';
import { LogTester } from '../tests/LogTester';
import { createOctokitRestStub } from '../tests/OctokitRestStub';
import { PullRequestAction } from './PullRequestAction';
import { OctokitActionStub } from '../tests/OctokitActionStub';

class TestPullRequestAction extends PullRequestAction {

  constructor(title: string, login?: string) {
    super();
    (this as unknown as OctokitActionStub).rest = createOctokitRestStub(title, null, login);
  }

  async processJiraIssue(issueId: string): Promise<void> {
    this.log(`Invoked processJiraIssue(${issueId})`);
  }
}

describe('PullRequestAction', () => {
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
    github.context.payload = {
      pull_request: {
        number: 42,
        title: "PR Title",
      },
      sender: {
        login: 'test-user',
        type: "User"
      }
    };
  });

  afterEach(() => {
    logTester.afterEach();
  });

  it('No issue ID', async () => {
    const sut = new TestPullRequestAction("Standalone PR");
    await sut.run();
    expect(logTester.logsParams).toStrictEqual([
      "Loading PR #42",
      "No Jira issue found in the PR title.",
      "Done",
    ]);
  });

  it('Process all title issue IDs', async () => {
    const sut = new TestPullRequestAction("GHA-42, [GHA-43] And also SCAN4NET-44 with number in project key, but no lowercase-22");
    await sut.run();
    expect(logTester.logsParams).toStrictEqual([
      "Loading PR #42",
      "Invoked processJiraIssue(GHA-42)",
      "Invoked processJiraIssue(GHA-43)",
      "Invoked processJiraIssue(SCAN4NET-44)",
      "Done",
    ]);
  });

  it('Process renovate issue ID', async () => {
    const sut = new TestPullRequestAction("Renovate PR with ID in comment", "renovate[bot]");
    (sut as any).rest.issues.listComments = function (params: any): any {
      return {
        data: [
          { body: "Renovate Jira issue ID: GHA-42" }
        ]
      }
    };
    await sut.run();
    expect(logTester.logsParams).toStrictEqual([
      "Loading PR #42",
      "Invoked processJiraIssue(GHA-42)",
      "Done"
    ]);
  });

  it('Ignore BUILD and PREQ', async () => {
    const sut = new TestPullRequestAction("GHA-42 is processed but BUILD-42 and PREQ-43 are ignored");
    await sut.run();
    expect(logTester.logsParams).toStrictEqual([
      "Loading PR #42",
      "Invoked processJiraIssue(GHA-42)",
      "Skipping BUILD-42",
      "Skipping PREQ-43",
      "Done"
    ]);
  });

  it('Process BUILD and PREQ for is-eng-xp-squad', async () => {
    const sut = new TestPullRequestAction("BUILD-42 and PREQ-43 are processed") as TestPullRequestAction & OctokitActionStub;
    sut.isEngXpSquad = true;
    await sut.run();
    expect(logTester.logsParams).toStrictEqual([
      "Loading PR #42",
      "Invoked processJiraIssue(BUILD-42)",
      "Invoked processJiraIssue(PREQ-43)",
      "Done",
    ]);
  });
});
