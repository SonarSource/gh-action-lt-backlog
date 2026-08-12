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
import { SlackClient } from './SlackClient.js';
import { LogTester } from '../tests/LogTester.js';

describe('SlackClient', () => {
  const itRunsOnlyInCI = process.env.GITHUB_ACTIONS === 'true' ? it : it.skip;
  let logTester: LogTester;

  beforeEach(() => {
    logTester = new LogTester();
  });

  afterEach(() => {
    logTester?.afterEach(); // When beforeAll fails, beforeEach is not called, but afterEach is.
  });

  it('findUserByEmail returns the matched user id', async () => {
    const sut = new SlackClient('token', 'channel') as any;
    sut.sendGet = async (url: string, params: Record<string, string>) => {
      expect(url).toBe('https://slack.com/api/users.lookupByEmail');
      expect(params).toStrictEqual({ email: 'john@example.com' });
      return { user: { id: 'U1' } };
    };
    expect(await sut.findUserByEmail('john@example.com')).toBe('U1');
  });

  it('findUserByEmail returns null when the lookup finds nobody', async () => {
    const sut = new SlackClient('token', 'channel') as any;
    sut.sendGet = async () => null;  // sendRequest returns null when the response is not ok
    expect(await sut.findUserByEmail('missing@example.com')).toBeNull();
  });

  // Local token is difficult to craft
  itRunsOnlyInCI('findUserByEmail resolves a real user (needs users:read.email scope)', async () => {
    const sut = new SlackClient(process.env.SLACK_TOKEN!, '');
    expect(await sut.findUserByEmail('alexander.meseldzija@sonarsource.com')).not.toBeNull();
    expect(await sut.findUserByEmail('nobody@sonarsource.example')).toBeNull();
  });

  // Local token is difficult to craft
  itRunsOnlyInCI('sendMessage succeeds', async () => {
    const sut = new SlackClient(process.env.SLACK_TOKEN!, 'notification_tester');
    await sut.sendMessage('gh-action-lt-backlog Unit Test');
    expect(logTester.logsParams).toStrictEqual([
      "Sending Slack message",
      "Sending slack POST: {\"channel\":\"notification_tester\",\"text\":\"gh-action-lt-backlog Unit Test\"}",
    ]);
  });

  // Local token is difficult to craft
  itRunsOnlyInCI('sendMessage fails', async () => {
    const sut = new SlackClient(process.env.SLACK_TOKEN!, 'this_channel_exists_only_when_someone_trolls_this_test');
    await sut.sendMessage('gh-action-lt-backlog Unit Test');
    expect(logTester.logsParams).toStrictEqual([
      "Sending Slack message",
      "Sending slack POST: {\"channel\":\"this_channel_exists_only_when_someone_trolls_this_test\",\"text\":\"gh-action-lt-backlog Unit Test\"}",
      "Failed to send API request. Error: channel_not_found"]);
  });
});
