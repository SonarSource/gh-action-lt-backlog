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
function compareVersionNames(leftName, rightName) {
    const left = parseVersion(leftName);
    const right = parseVersion(rightName);
    for (let i = 0; i < Math.max(left.numbers.length, right.numbers.length); i++) {
        const sign = Math.sign((left.numbers[i] ?? 0) - (right.numbers[i] ?? 0));
        if (sign !== 0) {
            return sign;
        }
    }
    return left.suffix.localeCompare(right.suffix, 'en', { numeric: true });
}
function parseVersion(name) {
    const index = name.indexOf('-');
    const numbers = index < 0 ? name : name.substring(0, index);
    const suffix = index < 0 ? 'ZZZ' : name.substring(index + 1); // ZZZ: Push normal release 1.0 after milestone 1.0-M1
    return { numbers: numbers.split('.').map(x => parseInt(x, 10) || 0), suffix };
}
//# sourceMappingURL=FixVersionResolver.js.map