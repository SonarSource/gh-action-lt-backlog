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

import { describe, expect, it } from 'vitest';
import { findLowestUnreleasedFixVersion } from './FixVersionResolver.js';
import { JiraClient } from './JiraClient.js';

describe('FixVersionResolver', () => {
  it('returns null when no unreleased versions exist', async () => {
    const jira = {
      findProjectVersions: async () => [{ id: '1', name: '1.0', released: true, archived: false }],
    } as unknown as JiraClient;

    await expect(findLowestUnreleasedFixVersion(jira, 'KEY')).resolves.toBeNull();
  });

  it('returns the only unreleased version', async () => {
    const jira = {
      findProjectVersions: async () => [{ id: '1', name: '8.32', released: false, archived: false }],
    } as unknown as JiraClient;

    await expect(findLowestUnreleasedFixVersion(jira, 'SONARJAVA')).resolves.toBe('8.32');
  });

  it('returns the lowest unreleased version', async () => {
    const jira = {
      findProjectVersions: async () => [
        { id: '1', name: '8.31', released: false, archived: false },
        { id: '2', name: '8.32.1', released: false, archived: false },
        { id: '3', name: '9.0', released: false, archived: false },
        { id: '4', name: '8.30', released: true, archived: false },
      ],
    } as unknown as JiraClient;

    await expect(findLowestUnreleasedFixVersion(jira, 'SONARJAVA')).resolves.toBe('8.31');
  });

  it('ranks final releases above pre-releases at the same version', async () => {
    const jira = {
      findProjectVersions: async () => [
        { id: '1', name: '8.32-M1', released: false, archived: false },
        { id: '2', name: '8.32', released: false, archived: false },
      ],
    } as unknown as JiraClient;

    await expect(findLowestUnreleasedFixVersion(jira, 'SONARJAVA')).resolves.toBe('8.32-M1');
  });
});
