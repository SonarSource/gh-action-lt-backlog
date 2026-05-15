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
import { ToggleLockBranch } from './ToggleLockBranch.js';
import { LogTester } from '../tests/LogTester.js';
import { createOctokitRestStub } from '../tests/OctokitRestStub.js';
import { OctokitActionStub } from '../tests/OctokitActionStub.js';
import { LockBranchActionStub } from '../tests/LockBranchActionStub.js';

async function runAction(currentLockBranch: boolean): Promise<void> {
  const pattern = process.env['INPUT_BRANCH-PATTERN']!;
  const action = new ToggleLockBranch() as unknown as LockBranchActionStub & OctokitActionStub & { run(): Promise<void> };
  action.findRule = async (pattern) => {
    console.log(`Invoked findRule(${pattern})`);
    return { id: 'rule-id', lockBranch: currentLockBranch, pattern };
  };
  action.updateRule = async (id, lockBranch) => {
    console.log(`Invoked updateRule(${id}, ${lockBranch})`);
    return { id, lockBranch, pattern };
  };
  action.cancelAutoMerge = async (pattern) => {
    console.log(`Invoked cancelAutoMerge(${pattern})`);
  };
  action.rest = createOctokitRestStub('Irrelevant');
  action.sendSlackPost = async (url, req) => {
    console.log(`Invoked sendSlackPost`);
    return {};
  };
  await action.run();
}

describe('ToggleLockBranch', () => {
  let logTester: LogTester;

  beforeEach(() => {
    logTester = new LogTester();
    process.env['GITHUB_REPOSITORY'] = 'test-owner/test-repo';
    process.env['INPUT_GITHUB-TOKEN'] = 'fake';
    process.env['INPUT_BRANCH-PATTERN'] = 'master';
    process.env['INPUT_SLACK-CHANNEL'] = '';
    process.env['INPUT_ADDITIONAL-MESSAGE'] = '';
  });

  afterEach(() => {
    logTester?.afterEach(); // When beforeAll fails, beforeEach is not called, but afterEach is.
  });

  it('Toggle unlocked to locked', async () => {
    await runAction(false);
    expect(logTester.logsParams).toStrictEqual([
      "Invoked findRule(master)",
      "Invoked updateRule(rule-id, true)",
      "Done: test-repo: The branch `master` was locked :ice_cube:",
      "Skip sending slack message, channel was not set.",
      "Done"
    ]);
  });

  it('Toggle locked to unlocked', async () => {
    await runAction(true);
    expect(logTester.logsParams).toStrictEqual([
      "Invoked findRule(master)",
      "Invoked cancelAutoMerge(master)",
      "Invoked updateRule(rule-id, false)",
      "Done: test-repo: The branch `master` was unlocked and is now open for changes :sunny:",
      "Skip sending slack message, channel was not set.",
      "Done"
    ]);
  });
});
