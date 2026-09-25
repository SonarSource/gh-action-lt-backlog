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
import { AnnounceRelease } from './AnnounceRelease.js';
import { LogTester } from '../tests/LogTester.js';
import { createOctokitRestStub } from '../tests/OctokitRestStub.js';
import { OctokitActionStub } from '../tests/OctokitActionStub.js';
import { LockBranchActionStub } from '../tests/LockBranchActionStub.js';
import * as github from '@actions/github';

function issue(key: string, assignee: string | null, summary: string): any {
  const account = assignee ? { accountId: assignee, emailAddress: `${assignee}@x.com`, displayName: assignee } : null;
  return { key, fields: { assignee: account, summary } };
}

const link = (key: string) => `<https://sonarsource.atlassian.net/browse/${key}|${key}>`;
const lockedBy = '*test-repo*: The branch `master` was locked :ice_cube: by <#test-url|test-user>';

function expectedLogs(issueCount: number, text: string): string[] {
  return [
    "Invoked findRule(master)",
    "Invoked updateRule(rule-id, true)",
    "Invoked findIssues(project = \"NET\" AND status = \"In Validation\")",
    `Found ${issueCount} issue(s)`,
    `Done: ${text}`,
    "Sending Slack message",
    `Invoked sendSlackPost(https://slack.com/api/chat.postMessage, ${JSON.stringify({ channel: 'test-channel', text })})`,
    "Done",
  ];
}

async function runAction(issues: any[], currentlyLocked: boolean = false, resolveSlack: (email: string) => string | null = email => `U-${email.split('@')[0]}`): Promise<void> {
  const pattern = process.env['INPUT_BRANCH-PATTERN']!;
  const action = new AnnounceRelease() as unknown as LockBranchActionStub & OctokitActionStub & { run(): Promise<void> };
  action.findRule = async (pattern) => {
    console.log(`Invoked findRule(${pattern})`);
    return { id: 'rule-id', lockBranch: currentlyLocked, pattern };
  };
  action.updateRule = async (id, lockBranch) => {
    console.log(`Invoked updateRule(${id}, ${lockBranch})`);
    return { id, lockBranch, pattern };
  };
  action.cancelAutoMerge = async (pattern) => {
    console.log(`Invoked cancelAutoMerge(${pattern})`);
  };
  action.jira.findIssues = async (jql: string) => {
    console.log(`Invoked findIssues(${jql})`);
    return issues;
  };
  action.slack.findUserByEmail = async (email: string) => resolveSlack(email);
  action.rest = createOctokitRestStub('Irrelevant');
  action.slack.sendPost = async (url: string, req: unknown) => {
    console.log(`Invoked sendSlackPost(${url}, ${JSON.stringify(req)})`);
    return {};
  };
  await action.run();
}

describe('AnnounceRelease', () => {
  let logTester: LogTester;

  beforeEach(() => {
    logTester = new LogTester();
    process.env['GITHUB_REPOSITORY'] = 'test-owner/test-repo';
    process.env['INPUT_GITHUB-TOKEN'] = 'fake';
    process.env['INPUT_JIRA-USER'] = 'fake';
    process.env['INPUT_JIRA-TOKEN'] = 'fake';
    process.env['INPUT_PROJECT'] = 'NET';
    process.env['INPUT_BRANCH-PATTERN'] = 'master';
    process.env['INPUT_SLACK-CHANNEL'] = 'test-channel';
    process.env['INPUT_SLACK-TOKEN'] = 'fake';
    process.env['INPUT_ADDITIONAL-MESSAGE'] = '';
    github.context.payload = {
      sender: {
        login: 'test-user',
        type: 'User',
        html_url: '#test-url'
      }
    };
  });

  afterEach(() => {
    logTester?.afterEach(); // When beforeAll fails, beforeEach is not called, but afterEach is.
  });

  it('Groups tickets by assignee and mentions them by Slack ID', async () => {
    await runAction([issue('ABC-1', 'Alice', 'Alpha'), issue('ABC-2', 'Alice', 'Beta'), issue('ABC-3', 'Bob', 'Gamma'), issue('ABC-4', null, 'Delta')]);
    expect(logTester.logsParams).toStrictEqual(expectedLogs(4,
`${lockedBy}
Locked for release.
Tickets to validate:
- <@U-Alice>
  * ${link('ABC-1')} Alpha
  * ${link('ABC-2')} Beta
- <@U-Bob>
  * ${link('ABC-3')} Gamma
- Unassigned
  * ${link('ABC-4')} Delta`));
  });

  it('Falls back to the display name when the assignee has no Slack account', async () => {
    await runAction([issue('ABC-1', 'Alice', 'Alpha')], false, () => null);
    expect(logTester.logsParams).toStrictEqual(expectedLogs(1,
`${lockedBy}
Locked for release.
Tickets to validate:
- Alice
  * ${link('ABC-1')} Alpha`));
  });

  it('Lists unassigned tickets', async () => {
    await runAction([issue('ABC-9', null, 'Orphan')]);
    expect(logTester.logsParams).toStrictEqual(expectedLogs(1,
`${lockedBy}
Locked for release.
Tickets to validate:
- Unassigned
  * ${link('ABC-9')} Orphan`));
  });

  it('Reports no tickets', async () => {
    await runAction([]);
    expect(logTester.logsParams).toStrictEqual(expectedLogs(0,
`${lockedBy}
Locked for release.
No tickets to validate.`));
  });

  it('Appends the additional-message before the ticket list', async () => {
    process.env['INPUT_ADDITIONAL-MESSAGE'] = 'Planned for Friday';
    await runAction([issue('ABC-1', 'Alice', 'Alpha')]);
    expect(logTester.logsParams).toStrictEqual(expectedLogs(1,
`${lockedBy}

Planned for Friday
Locked for release.
Tickets to validate:
- <@U-Alice>
  * ${link('ABC-1')} Alpha`));
  });

  it('Does not post when the branch is already locked', async () => {
    await runAction([issue('ABC-1', 'Alice', 'Alpha')], true);
    expect(logTester.logsParams).toStrictEqual([
      "Invoked findRule(master)",
      "The branch `master` is already locked.",
      "Done"
    ]);
  });
});
