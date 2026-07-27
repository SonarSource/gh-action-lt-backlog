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
export async function findLowestUnreleasedFixVersion(jira, projectKey) {
    const allVersions = await jira.findProjectVersions(projectKey);
    const unreleased = allVersions.filter(x => !x.released && !x.archived).toSorted((left, right) => compareVersionNames(left.name, right.name));
    if (unreleased.length === 0) {
        console.log(`${projectKey}: No unreleased versions found`);
        return null;
    }
    else {
        console.log(`${projectKey}: Found ${unreleased.length} unreleased versions ${unreleased.map(x => x.name).join(', ')}, using ${unreleased[0].name}`);
        return unreleased[0].name;
    }
}
function compareVersionNames(left, right) {
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
function compareVersionPart(leftPart, rightPart) {
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
function parseNumericVersionPart(part) {
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
function normalizeVersionName(versionName) {
    return versionName.replace(/\.0$/, '');
}
//# sourceMappingURL=FixVersionResolver.js.map