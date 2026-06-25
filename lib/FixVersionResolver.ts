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

import { JiraClient } from './JiraClient.js';

export const FIX_VERSION_AUTODETECT_LOWEST = 'autodetect-lowest';

export async function findLowestUnreleasedFixVersion(jira: JiraClient, projectKey: string): Promise<string | null> {
  const versions = await jira.findProjectVersions(projectKey);
  const unreleased = versions.filter((version) => !version.released && !version.archived);

  if (unreleased.length === 0) {
    console.log(`${projectKey}: No unreleased versions found, skipping fix version`);
    return null;
  }

  const sortedUnreleased = unreleased.toSorted((left, right) =>
    compareVersionNames(left.name, right.name),
  );
  const selected = sortedUnreleased[0];
  if (unreleased.length > 1) {
    console.log(`${projectKey}: Found ${unreleased.length} unreleased versions, using lowest ${selected.name}`);
  }
  return selected.name;
}

function compareVersionNames(left: string, right: string): number {
  const leftParts = normalizeVersionName(left).split('.');
  const rightParts = normalizeVersionName(right).split('.');
  const length = Math.max(leftParts.length, rightParts.length);

  for (let index = 0; index < length; index++) {
    const comparison = compareVersionPart(leftParts[index] ?? '', rightParts[index] ?? '');
    if (comparison !== 0) {
      return comparison;
    }
  }

  return 0;
}

function compareVersionPart(leftPart: string, rightPart: string): number {
  const leftParsed = parseNumericVersionPart(leftPart);
  const rightParsed = parseNumericVersionPart(rightPart);

  if (leftParsed && rightParsed) {
    if (leftParsed.number !== rightParsed.number) {
      return leftParsed.number - rightParsed.number;
    }

    const leftSuffix = leftParsed.suffix;
    const rightSuffix = rightParsed.suffix;
    if (leftSuffix === rightSuffix) {
      return 0;
    }
    if (leftSuffix === '') {
      return 1;
    }
    if (rightSuffix === '') {
      return -1;
    }
    return leftSuffix.localeCompare(rightSuffix, 'en', { numeric: true });
  }

  return leftPart.localeCompare(rightPart, 'en', { numeric: true });
}

function parseNumericVersionPart(part: string): { number: number; suffix: string } | null {
  let index = 0;
  while (index < part.length) {
    const character = part[index];
    if (character === undefined || character < '0' || character > '9') {
      break;
    }
    index++;
  }
  if (index === 0) {
    return null;
  }

  return {
    number: Number(part.slice(0, index)),
    suffix: part.slice(index),
  };
}

function normalizeVersionName(versionName: string): string {
  return versionName.replace(/\.0$/, '');
}
