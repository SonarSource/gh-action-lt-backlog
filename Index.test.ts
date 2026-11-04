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
import * as github from '@actions/github';
import { LogTester } from './tests/LogTester.js';
import { run } from './Index.js';

describe('Index', () => {
  let logTester: LogTester;

  beforeEach(() => {
    logTester = new LogTester();
    process.env['GITHUB_REPOSITORY'] = 'test-owner/test-repo';
    process.env['INPUT_GITHUB-TOKEN'] = 'fake';
  });

  afterEach(() => {
    logTester?.afterEach(); // When beforeAll fails, beforeEach is not called, but afterEach is.
  });

  it('Known action', async () => {
    github.context.payload = {
      pull_request: {
        number: 42,
        title: "PR Title",
      }
    };
    await run('LogPayload');
    expect(logTester.logsParams).toStrictEqual([
      "--- Event payload ---",
      `{
  "pull_request": {
    "number": 42,
    "title": "PR Title"
  }
}`,
      "----------",
      "Done",
    ]);
  });

  it('Unknown action', async () => {
    const stdout = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    const originalExitCode = process.exitCode;
    try {
      await run('Unknown');
      expect(process.exitCode).toBe(1);
      expect(stdout.mock.calls.map(x => String(x[0])).join('')).toContain(`::error::Unknown action 'Unknown'.`);
    } finally {
      process.exitCode = originalExitCode;
      vi.restoreAllMocks();
    }
  });
});
