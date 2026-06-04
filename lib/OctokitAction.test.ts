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

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LogTester } from '../tests/LogTester.js';
import { jiraClientStub } from '../tests/JiraClientStub.js';
import { createOctokitRestStub } from '../tests/OctokitRestStub.js';
import { OctokitAction } from './OctokitAction.js';
import { fail } from 'node:assert';
import { OctokitActionStub } from '../tests/OctokitActionStub.js';
import { TeamReviewDataStub } from '../tests/TeamReviewDataStub.js';

class TestOctokitAction extends OctokitAction {

  constructor(login: string | undefined = undefined, body: string | null | undefined = undefined) {
    super();
    (this as unknown as OctokitActionStub).jira = { ...jiraClientStub }; // Expanded copy, we'll be modifying it in these tests
    (this as unknown as OctokitActionStub).rest = createOctokitRestStub('PR title', body, login);
    (this as unknown as OctokitActionStub).payload.sender = { login: 'test-user', type: 'User' }
  }

  async execute(): Promise<void> {
    this.log('Invoked execute()');
  }
}

describe('OctokitAction', () => {
  const originalKeys = Object.keys(process.env);
  const itRunsOnlyInCI = process.env.GITHUB_ACTIONS === 'true' ? it : it.skip;
  let logTester: LogTester;
  let sut: any; // TestOctokitAction, but with access to protected methods

  beforeEach(() => {
    logTester = new LogTester();
    const token = process.env["GITHUB_TOKEN"];
    if (token) {
      for (const key of Object.keys(process.env)) {
        if (!originalKeys.includes(key)) {
          // Otherwise, changes form previous UT are propagated to the next one
          delete process.env[key];
        }
      }
      process.env['GITHUB_REPOSITORY'] = 'SonarSource/test-repo'; // Owner needs to be correct for findEmails to work properly
      process.env['INPUT_GITHUB-TOKEN'] = token;
      sut = new TestOctokitAction();
    } else {
      fail("OctokitAction tests require GITHUB_TOKEN environment variables to be set.");
    }
  });

  afterEach(() => {
    logTester?.afterEach(); // When beforeAll fails, beforeEach is not called, but afterEach is.
  });

  it('isEngXpSquad is true', async () => {
    process.env['INPUT_IS-ENG-XP-SQUAD'] = 'true';
    const action = new TestOctokitAction() as TestOctokitAction & OctokitActionStub;
    expect(action.isEngXpSquad).toBe(true);
  });

  it('isEngXpSquad is false', async () => {
    const action = new TestOctokitAction() as TestOctokitAction & OctokitActionStub;
    expect(action.isEngXpSquad).toBe(false);
  });

  it('sendGraphQL', async () => {
    const result = await sut.sendGraphQL(`
      query {
        repository (owner: "SonarSource", name: "gh-action-lt-backlog") {
          id
          name
        }
      }`);
    expect(result).toEqual({
      repository: {
        id: "R_kgDOGZ6k-Q",
        name: "gh-action-lt-backlog"
      }
    })
  });

  it('inputString', async () => {
    process.env['INPUT_KEY'] = 'Value'; // KEY must be upper case, otherwise Ubuntu in CI doesn't work
    expect(sut.inputString('key')).toBe('Value');
    expect(sut.inputString('missing')).toBe('');
  });

  it('inputNumber', async () => {
    process.env['INPUT_KEY'] = '42';
    process.env['INPUT_STRING'] = 'Lorem Ipsum';
    expect(sut.inputNumber('key')).toBe(42);
    expect(() => sut.inputNumber('string')).toThrow("Value of input 'string' is not a number: Lorem Ipsum")
  });

  it('inputBoolean true', async () => {
    for (const value of ['true', 'True', 'TRUE', 'tRuE']) {
      process.env['INPUT_KEY'] = value;
      expect(sut.inputBoolean('key')).toBe(true);
    }
  });

  it('inputBoolean false', async () => {
    for (const value of ['', 'false', 'False', '0', 'no']) {
      process.env['INPUT_KEY'] = value;
      expect(sut.inputBoolean('key')).toBe(false);
    }
  });

  it('loadPullRequest', async () => {
    const pr = await sut.loadPullRequest(42);
    expect(pr).toMatchObject({ number: 42, title: "PR title" });  // Plus the remaining properties from scaffolding
    expect(pr.isRenovate()).toBe(false);
    expect(pr.isBot()).toBe(false);
    expect(logTester.logsParams).toStrictEqual(["Loading PR #42"]);
  });

  it('loadPullRequest Renovate cloud', async () => {
    const sut = new TestOctokitAction('renovate[bot]') as any;
    const pr = await sut.loadPullRequest(42);
    expect(pr.isRenovate()).toBe(true);
    expect(pr.isBot()).toBe(true);
  });

  it('loadPullRequest Renovate self-hosted', async () => {
    const sut = new TestOctokitAction('hashicorp-vault-sonar-prod[bot]', `Long PR body
---

 - [ ] <!-- rebase-check -->If you want to rebase/retry this PR, check this box

---
---

This PR has been generated by [Renovate Bot](https://togithub.com/renovatebot/renovate).
      <!--renovate - debug: eyJjcmVhdGVkSW5WZXIiOiIzNy40MDkuMSIsInVwZGF0ZWRJblZlciI6IjM3LjQwOS4xIiwidGFyZ2V0QnJhbmNoIjoibWFzdGVyIiwibGFiZWxzIjpbImRlcGVuZGVuY2llcyJdfQ == -->
`) as any;
    const pr = await sut.loadPullRequest(42);
    expect(pr.isRenovate()).toBe(true);
    expect(pr.isBot()).toBe(true);
  });

  it('loadPullRequest Vault-based automation', async () => {
    const sut = new TestOctokitAction('hashicorp-vault-sonar-prod[bot]') as any;
    const pr = await sut.loadPullRequest(42);
    expect(pr.isRenovate()).toBe(false);
    expect(pr.isBot()).toBe(true);
  });

  it('loadPullRequest Dependabot', async () => {
    const sut = new TestOctokitAction('dependabot[bot]') as any;
    const pr = await sut.loadPullRequest(42);
    expect(pr.isRenovate()).toBe(false);
    expect(pr.isBot()).toBe(true);
  });

  it('loadPullRequest Another bot', async () => {
    const sut = new TestOctokitAction('any-other-bot[bot]') as any;
    const pr = await sut.loadPullRequest(42);
    expect(pr.isRenovate()).toBe(false);
    expect(pr.isBot()).toBe(true);
  });

  it('loadIssue', async () => {
    const issue = await sut.loadIssue(24);
    expect(issue).toMatchObject({ number: 24, title: "Issue title" });  // Plus the remaining properties from scaffolding
    expect(logTester.logsParams).toStrictEqual(["Loading issue #24"]);
  });

  it('findFixedIssues no issue', async () => {
    const pr = await sut.loadPullRequest(42);
    pr.title = "Standalone PR";
    expect(await sut.findFixedIssues(pr)).toBeNull();

  });

  it('findFixedIssues with issues', async () => {
    const pr = await sut.loadPullRequest(42);
    pr.title = "GHA-42, [GHA-43] And also SCAN4NET-44 with number in project key, but no lowercase-22"
    expect(await sut.findFixedIssues(pr)).toStrictEqual([
      "GHA-42",
      "GHA-43",
      "SCAN4NET-44"
    ]);
  });

  it('findFixedIssues renovate no renovate issue comment', async () => {
    sut.rest.issues.listComments = function (params: any): any {
      return {
        data: [
          { body: "SQ QG or something else" },
          { body: null },
        ]
      }
    }
    const pr = await sut.loadPullRequest(42);
    pr.user.login = 'renovate[bot]';
    expect(await sut.findFixedIssues(pr)).toBeNull();
  });

  it('findFixedIssues renovate with renovate issue issue', async () => {
    sut.rest.issues.listComments = function (params: any): any {
      return {
        data: [
          { body: "SQ QG or something else" },
          { body: null },
          { body: "Renovate Jira issue ID: GHA-42" }
        ]
      }
    }
    const pr = await sut.loadPullRequest(42);
    pr.user.login = 'renovate[bot]';
    expect(await sut.findFixedIssues(pr)).toStrictEqual(["GHA-42"]);
  });

  it('addComment', async () => {
    await sut.addComment(42, "Lorem ipsum");
    expect(logTester.logsParams).toStrictEqual(["Invoked rest.issues.createComment({\"owner\":\"SonarSource\",\"repo\":\"test-repo\",\"issue_number\":42,\"body\":\"Lorem ipsum\"})"]);
  });

  it('listComments', async () => {
    await sut.listComments(42);
    expect(logTester.logsParams).toStrictEqual(["Invoked rest.issues.listComments({\"owner\":\"SonarSource\",\"repo\":\"test-repo\",\"issue_number\":42})"]);
  });

  it('loadSenderAccountId', async () => {
    let callCount = 0;
    sut.findEmails = async function (login: string): Promise<string[]> {
      callCount += 1;
      return ['user@sonarsource.com'];
    }
    expect(await sut.loadSenderAccountId()).toBe('1234-account');
    expect(await sut.loadSenderAccountId()).toBe('1234-account');
    expect(callCount).toBe(1);
  });

  it('listTeamMembers caches', async () => {
    expect(await sut.listTeamMembers('platform-cloud-eng-squad')).toHaveLength(2);
    expect(await sut.listTeamMembers('platform-cloud-eng-squad')).toHaveLength(2);
    expect(await sut.listTeamMembers('platform-cloud-prod-eng-squad')).toHaveLength(2);
    expect(logTester.logsParams).toStrictEqual([
      "Loading members of platform-cloud-eng-squad",
      "Invoked rest.teams.listMembersInOrg({\"org\":\"SonarSource\",\"team_slug\":\"platform-cloud-eng-squad\",\"per_page\":100})",
      "Loading members of platform-cloud-prod-eng-squad",
      "Invoked rest.teams.listMembersInOrg({\"org\":\"SonarSource\",\"team_slug\":\"platform-cloud-prod-eng-squad\",\"per_page\":100})"
    ]);
  });

  it('updateIssueTitle', async () => {
    await sut.updateIssueTitle(42, 'New title');
    expect(logTester.logsParams).toStrictEqual([
      "Updating issue #42 title to: New title",
      "Invoked rest.issues.update({\"owner\":\"SonarSource\",\"repo\":\"test-repo\",\"issue_number\":42,\"title\":\"New title\"})"
    ]);
  });

  it('updatePullRequestTitle', async () => {
    await sut.updatePullRequestTitle(42, 'New title');
    expect(logTester.logsParams).toStrictEqual([
      "Updating PR #42 title to: New title",
      "Invoked rest.pulls.update({\"owner\":\"SonarSource\",\"repo\":\"test-repo\",\"pull_number\":42,\"title\":\"New title\"})"
    ]);
  });

  it('updatePullRequestDescription', async () => {
    await sut.updatePullRequestDescription(42, 'New description');
    expect(logTester.logsParams).toStrictEqual([
      "Updating PR #42 description",
      "Invoked rest.pulls.update({\"owner\":\"SonarSource\",\"repo\":\"test-repo\",\"pull_number\":42,\"body\":\"New description\"})"
    ]);
  });

  // Local token is impossible to craft with required permissions
  itRunsOnlyInCI('findEmails succeeds', async () => {
    // Preferably choose someone from https://github.com/orgs/SonarSource/people when visited in incognito mode, not to leak any information
    expect(await sut.findEmails('agigleux')).toEqual([expect.stringContaining('sonar')]); // Do not write the full email address here to avoid its exposure
    expect(logTester.logsParams).toStrictEqual([
      "Searching for email of agigleux",
      "Found 1 email(s) for agigleux"
    ]);
  });

  // Local token is impossible to craft with required permissions
  itRunsOnlyInCI('findEmails no results', async () => {
    expect(await sut.findEmails('renovate[bot]')).toEqual([]);
    expect(logTester.logsParams).toStrictEqual([
      "Searching for email of renovate[bot]",
      "No email found for renovate[bot]: Could not resolve to a User with the login of 'renovate[bot]'.",
    ]);
  });

  // Local token is difficult to craft
  itRunsOnlyInCI('sendSlackMessage succeeds', async () => {
    process.env['INPUT_SLACK-TOKEN'] = process.env.SLACK_TOKEN;
    process.env['INPUT_SLACK-CHANNEL'] = 'notification_tester';
    await sut.sendSlackMessage('gh-action-lt-backlog Unit Test');
    expect(logTester.logsParams).toStrictEqual([
      "Sending Slack message",
      "Sending slack POST: {\"channel\":\"notification_tester\",\"text\":\"gh-action-lt-backlog Unit Test\"}",
    ]);
  });

  // Local token is difficult to craft
  itRunsOnlyInCI('sendSlackMessage fails', async () => {
    process.env['INPUT_SLACK-TOKEN'] = process.env.SLACK_TOKEN;
    process.env['INPUT_SLACK-CHANNEL'] = 'this_channel_exists_only_when_someone_trolls_this_test';
    await sut.sendSlackMessage('gh-action-lt-backlog Unit Test');
    expect(logTester.logsParams).toStrictEqual([
      "Sending Slack message",
      "Sending slack POST: {\"channel\":\"this_channel_exists_only_when_someone_trolls_this_test\",\"text\":\"gh-action-lt-backlog Unit Test\"}",
      "Failed to send API request. Error: channel_not_found"]);
  });

  it('processRequestReview', async () => {
    const pr = await sut.loadPullRequest(42);
    sut.findEmails = async function (login: string): Promise<string[]> {
      return ["test.user@sonarsource.com"];
    }
    await sut.processRequestReview(pr, 'NET-42', 'Component is used only for team review', { login: 'test-user', type: 'User' }, null);
    expect(logTester.logsParams).toStrictEqual([
      "Loading PR #42",
      "Invoked jira.moveIssue('NET-42', 'Request Review', null)",
      "Invoked jira.assignIssueToEmail('NET-42', ['test.user@sonarsource.com'])"
    ]);
  });

  it('processRequestReview is-eng-xp-squad', async () => {
    sut.isEngXpSquad = true;
    sut.findEmails = async function (login: string): Promise<string[]> {
      return ["test.user@sonarsource.com"];
    }
    const pr = await sut.loadPullRequest(42);
    await sut.processRequestReview(pr, 'NET-42', '', { login: 'test-user', type: 'User' }, null);
    expect(logTester.logsParams).toStrictEqual([
      "Loading PR #42",
      "Invoked jira.moveIssue('NET-42', 'Request Review', null)",
      "Invoked jira.addReviewer('NET-42', ['test.user@sonarsource.com'])"
    ]);
  });

  it('processRequestReview from platform team', async () => {
    const pr = await sut.loadPullRequest(42);
    await sut.processRequestReview(pr, 'NET-42', 'Some Component', null, TeamReviewDataStub.createCloudEngineering('1234-account', '5000-assignee'));
    expect(logTester.logsParams).toStrictEqual([
      "Loading PR #42",
      "Invoked jira.moveIssue('NET-42', 'Request Review', null)",
      "Found 1 Evergreen Epic(s), using SC-1000 Current SC Review Epic platform-cloud-eng-squad",
      "Creating PREQ review issue",
      "Invoked jira.createIssue('PREQ', 'PR review for PR title', {\"issuetype\":{\"name\":\"Maintenance\"},\"reporter\":{\"id\":\"1234-account\"},\"customfield_10001\":\"772ea1dc-3574-42bc-a378-7a898d910ebd\",\"labels\":[\"preq-review-code\"],\"parent\":{\"key\":\"SC-1000\"}})",
      "Invoked jira.assignIssueToAccount('PREQ-4242', '5000-assignee')",
      "Invoked jira.addIssueRemoteLink('PREQ-4242'', 'https://github.com/test-owner/test-repo/pull/42', null)",
      "Invoked jira.linkIssues('PREQ-4242', 'NET-42', 'Relates')",
      "Invoked rest.issues.createComment({\"owner\":\"SonarSource\",\"repo\":\"test-repo\",\"issue_number\":42,\"body\":\"Team Review Jira issue ID: [PREQ-4242](https://sonarsource.atlassian.net/browse/PREQ-4242) platform-cloud-eng-squad\\n<!--slug: platform-cloud-eng-squad -->\"})",
      "Invoked jira.createComponent('PREQ', 'Some Component', 'null')",
      "Invoked jira.addIssueComponent('PREQ-4242', 'Some Component')",
    ]);
  });

  it('processRequestReview from another team', async () => {
    const pr = await sut.loadPullRequest(42);
    await sut.processRequestReview(pr, 'NET-42', '', null, null);
    expect(logTester.logsParams).toStrictEqual([
      "Loading PR #42"
      // Issue is not moved
    ]);
  });

  it('processRequestReview from Bot', async () => {
    const pr = await sut.loadPullRequest(42);
    await sut.processRequestReview(pr, 'NET-42', '', { login: 'renovate[bot]', type: 'Bot' }, null);
    expect(logTester.logsParams).toStrictEqual([
      "Loading PR #42",
      "Skipping request review from bot: renovate[bot]"
    ]);
  });

  it('addJiraComponent success', async () => {
    await sut.addJiraComponent('GHA-42', 'Component Name', 'Component Description');
    expect(logTester.logsParams).toStrictEqual([
      "Invoked jira.createComponent('GHA', 'Component Name', 'Component Description')",
      "Invoked jira.addIssueComponent('GHA-42', 'Component Name')",
    ]);
  });

  it('addJiraComponent fails to create component', async () => {
    sut.jira.createComponent = async function (projectKey: string, name: string, description: string): Promise<boolean> {
      console.log('Invoked jira.createComponent returning false');
      return false;
    }
    sut.setFailed = vi.fn();
    await sut.addJiraComponent('GHA-42', 'Component Name', 'Component Description');
    expect(sut.setFailed).toHaveBeenCalledWith('Failed to create component');
    expect(logTester.logsParams).toStrictEqual(["Invoked jira.createComponent returning false"]);
  });

  it('addJiraComponent fails to assign component', async () => {
    sut.jira.addIssueComponent = async function (issueId: string, name: string): Promise<boolean> {
      console.log('Invoked jira.addIssueComponent returning false');
      return false;
    }
    sut.setFailed = vi.fn();
    await sut.addJiraComponent('GHA-42', 'Component Name', 'Component Description');
    expect(sut.setFailed).toHaveBeenCalledWith('Failed to add component');
    expect(logTester.logsParams).toStrictEqual([
      "Invoked jira.createComponent('GHA', 'Component Name', 'Component Description')",
      "Invoked jira.addIssueComponent returning false"
    ]);
  });

  it('addJiraComponent empty', async () => {
    await sut.addJiraComponent('GHA-42', '');
    expect(logTester.logsParams).toStrictEqual([]);
  });

  describe('findRootlyOnCallEmails', () => {
    // User tokens can't be crafted by default
    itRunsOnlyInCI('succeeds', async () => {
      // Preferably choose someone from https://github.com/orgs/SonarSource/people when visited in incognito mode, not to leak any information
      process.env['INPUT_ROOTLY-TOKEN'] = process.env.ROOTLY_TOKEN;
      expect(await sut.findRootlyOnCallEmails('a8f6f785-aea9-4647-8200-f249dfd5fa70')).toEqual([expect.stringContaining('sonar')]);
      expect(logTester.logsParams).toStrictEqual([
        "Finding Rootly On-Call email for schedule: a8f6f785-aea9-4647-8200-f249dfd5fa70",
        "Found 1 Rootly On-Call users",
      ]);
    });

    // User tokens can't be crafted by default
    itRunsOnlyInCI('invalid schedule id', async () => {
      process.env['INPUT_ROOTLY-TOKEN'] = process.env.ROOTLY_TOKEN;
      expect(await sut.findRootlyOnCallEmails('nonexistent-id')).toHaveLength(0);
      expect(logTester.logsParams).toStrictEqual([
        "Finding Rootly On-Call email for schedule: nonexistent-id",
        "Rootly request failed. Error 404: Not Found",
        "Found 0 Rootly On-Call users",
      ]);
    });

    // User tokens can't be crafted by default
    itRunsOnlyInCI('request error', async () => {
      process.env['INPUT_ROOTLY-TOKEN'] = 'invalid-token';
      expect(await sut.findRootlyOnCallEmails('Anything')).toHaveLength(0);
      expect(logTester.logsParams).toStrictEqual([
        "Finding Rootly On-Call email for schedule: Anything",
        "Rootly request failed. Error 401: Unauthorized",
        "Found 0 Rootly On-Call users",
      ]);
    });

    // User tokens can't be crafted by default
    itRunsOnlyInCI('no token', async () => {
      expect(await sut.findRootlyOnCallEmails('Anything')).toHaveLength(0);
      expect(logTester.logsParams).toStrictEqual([
        "Finding Rootly On-Call email for schedule: Anything",
        "rootly-token was not set, request can not be send",
        "Found 0 Rootly On-Call users",
      ]);
    });
  });

});
