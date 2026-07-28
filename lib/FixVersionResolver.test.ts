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
import { findLowestUnreleasedFixVersion } from './FixVersionResolver.js';
import { JiraClient } from './JiraClient.js';
import { LogTester } from '../tests/LogTester.js';

function createJiraClient(versions: { name: string; released: boolean; archived: boolean }[]): JiraClient {
  return {
    findProjectVersions: async () => versions,
  } as unknown as JiraClient
}

function createJiraClientSimple(versions: string[]): JiraClient {
  return createJiraClient(versions.map(x => ({ name: x, released: false, archived: false })));
}

describe('FixVersionResolver', () => {
  let logTester: LogTester;

  beforeEach(() => {
    logTester = new LogTester();
  });

  afterEach(() => {
    logTester?.afterEach(); // When beforeAll fails, beforeEach is not called, but afterEach is.
  });

  it('no unreleased versions', async () => {
    const jira = createJiraClient([
      { name: '1.0', released: true, archived: false },
      { name: '2.0', released: false, archived: true }]);
    await expect(findLowestUnreleasedFixVersion(jira, 'KEY')).resolves.toBeNull();
    expect(logTester.logsParams).toStrictEqual(["KEY: No unreleased versions found"]);
  });

  it('mixed states returns only unreleased', async () => {
    const jira = createJiraClient([
      { name: '0.9', released: true, archived: true },
      { name: '1.0', released: true, archived: false },
      { name: '2.0', released: false, archived: false },
      { name: '3.0', released: false, archived: false },
      { name: '4.0', released: false, archived: true }]);

    await expect(findLowestUnreleasedFixVersion(jira, 'KEY')).resolves.toBe('2.0');
    expect(logTester.logsParams).toStrictEqual(["KEY: Found 2 unreleased versions 2.0, 3.0, using 2.0"]);
  });

  it('multiple versions return lowest - with major', async () => {
    const jira = createJiraClientSimple([
      '8',
      '8.31',
      '8.31.1',
      '8.32',
      '9.0']);
    await expect(findLowestUnreleasedFixVersion(jira, 'KEY')).resolves.toBe('8');
  });

  it('multiple versions return lowest - with minor', async () => {
    const jira = createJiraClientSimple([
      '8.31',
      '8.31.1',
      '8.32',
      '9.0']);
    await expect(findLowestUnreleasedFixVersion(jira, 'KEY')).resolves.toBe('8.31');
  });

  it('multiple versions return lowest - with bugfix', async () => {
    const jira = createJiraClientSimple([
      '8.31.2',
      '8.31.3',
      '8.32',
      '9']);
    await expect(findLowestUnreleasedFixVersion(jira, 'KEY')).resolves.toBe('8.31.2');
  });

  it('prerelease version is lowest', async () => {
    const jira = createJiraClientSimple([
      '8.32-M1',
      '8.32-M2',
      '8.32']);
    await expect(findLowestUnreleasedFixVersion(jira, 'KEY')).resolves.toBe('8.32-M1');
  });

  it('prerelease versions alphabetically', async () => {
    const jira = createJiraClientSimple([
      '8.32-B',
      '8.32-A',
      '8.32-C']);
    await expect(findLowestUnreleasedFixVersion(jira, 'KEY')).resolves.toBe('8.32-A');
  });

  it('prerelease and bugfix', async () => {
    const jira = createJiraClientSimple([
      '8.32-B',
      '8.32.1-A']);
    await expect(findLowestUnreleasedFixVersion(jira, 'KEY')).resolves.toBe('8.32-B');
  });
});
