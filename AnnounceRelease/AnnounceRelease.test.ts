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

function issue(key: string, assignee: string | null): any {
  const account = assignee ? { accountId: assignee, emailAddress: `${assignee}@x.com`, displayName: assignee } : null;
  return { key, fields: { assignee: account } };
}

const link = (key: string) => `<https://sonarsource.atlassian.net/browse/${key}|${key}>`;

const lockedBy = '*test-repo*: The branch `master` was locked :ice_cube: by <#test-url|test-user>';

function slackIdsFrom(issues: any[]): Map<string, string> {
  const ids = new Map<string, string>();
  for (const { fields } of issues) {
    const assignee = fields.assignee;
    if (assignee) {
      ids.set(assignee.emailAddress, `U-${assignee.displayName}`);
    }
  }
  return ids;
}

async function runAction(issues: any[], currentlyLocked: boolean = false, slackIds: Map<string, string> = slackIdsFrom(issues)): Promise<void> {
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
  action.jira.findAllIssues = async (jql: string) => {
    console.log(`Invoked findAllIssues(${jql})`);
    return issues;
  };
  action.slack.findUserByEmail = async (email: string) => slackIds.get(email) ?? null;
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
    await runAction([issue('ABC-1', 'Alice'), issue('ABC-2', 'Alice'), issue('ABC-3', 'Bob'), issue('ABC-4', null)]);
    expect(logTester.logsParams).toStrictEqual([
      "Invoked findRule(master)",
      "Invoked updateRule(rule-id, true)",
      "Invoked findAllIssues(project = \"NET\" AND status = \"In Validation\")",
      "Found 4 issue(s) in 'In Validation'",
      `Done: ${lockedBy}\nTickets to validate:\n- <@U-Alice>\n  * ${link('ABC-1')}\n  * ${link('ABC-2')}\n- <@U-Bob>\n  * ${link('ABC-3')}\n- Unassigned\n  * ${link('ABC-4')}`,
      "Sending Slack message",
      `Invoked sendSlackPost(https://slack.com/api/chat.postMessage, {"channel":"test-channel","text":"${lockedBy}\\nTickets to validate:\\n- <@U-Alice>\\n  * ${link('ABC-1')}\\n  * ${link('ABC-2')}\\n- <@U-Bob>\\n  * ${link('ABC-3')}\\n- Unassigned\\n  * ${link('ABC-4')}"})`,
      "Done"
    ]);
  });

  it('Falls back to the display name when the assignee has no Slack account', async () => {
    await runAction([issue('ABC-1', 'Alice')], false, new Map());
    expect(logTester.logsParams).toStrictEqual([
      "Invoked findRule(master)",
      "Invoked updateRule(rule-id, true)",
      "Invoked findAllIssues(project = \"NET\" AND status = \"In Validation\")",
      "Found 1 issue(s) in 'In Validation'",
      `Done: ${lockedBy}\nTickets to validate:\n- Alice\n  * ${link('ABC-1')}`,
      "Sending Slack message",
      `Invoked sendSlackPost(https://slack.com/api/chat.postMessage, {"channel":"test-channel","text":"${lockedBy}\\nTickets to validate:\\n- Alice\\n  * ${link('ABC-1')}"})`,
      "Done"
    ]);
  });

  it('Lists unassigned tickets', async () => {
    await runAction([issue('ABC-9', null)]);
    expect(logTester.logsParams).toStrictEqual([
      "Invoked findRule(master)",
      "Invoked updateRule(rule-id, true)",
      "Invoked findAllIssues(project = \"NET\" AND status = \"In Validation\")",
      "Found 1 issue(s) in 'In Validation'",
      `Done: ${lockedBy}\nTickets to validate:\n- Unassigned\n  * ${link('ABC-9')}`,
      "Sending Slack message",
      `Invoked sendSlackPost(https://slack.com/api/chat.postMessage, {"channel":"test-channel","text":"${lockedBy}\\nTickets to validate:\\n- Unassigned\\n  * ${link('ABC-9')}"})`,
      "Done"
    ]);
  });

  it('Reports no tickets', async () => {
    await runAction([]);
    expect(logTester.logsParams).toStrictEqual([
      "Invoked findRule(master)",
      "Invoked updateRule(rule-id, true)",
      "Invoked findAllIssues(project = \"NET\" AND status = \"In Validation\")",
      "Found 0 issue(s) in 'In Validation'",
      `Done: ${lockedBy}\nNo tickets to validate.`,
      "Sending Slack message",
      `Invoked sendSlackPost(https://slack.com/api/chat.postMessage, {"channel":"test-channel","text":"${lockedBy}\\nNo tickets to validate."})`,
      "Done"
    ]);
  });

  it('Appends the additional-message before the ticket list', async () => {
    process.env['INPUT_ADDITIONAL-MESSAGE'] = 'Planned for Friday';
    await runAction([issue('ABC-1', 'Alice')]);
    expect(logTester.logsParams).toStrictEqual([
      "Invoked findRule(master)",
      "Invoked updateRule(rule-id, true)",
      "Invoked findAllIssues(project = \"NET\" AND status = \"In Validation\")",
      "Found 1 issue(s) in 'In Validation'",
      `Done: ${lockedBy}\n\nPlanned for Friday\nTickets to validate:\n- <@U-Alice>\n  * ${link('ABC-1')}`,
      "Sending Slack message",
      `Invoked sendSlackPost(https://slack.com/api/chat.postMessage, {"channel":"test-channel","text":"${lockedBy}\\n\\nPlanned for Friday\\nTickets to validate:\\n- <@U-Alice>\\n  * ${link('ABC-1')}"})`,
      "Done"
    ]);
  });

  it('Does not post when the branch is already locked', async () => {
    await runAction([issue('ABC-1', 'Alice')], true);
    expect(logTester.logsParams).toStrictEqual([
      "Invoked findRule(master)",
      "The branch `master` is already locked.",
      "Done"
    ]);
  });
});
