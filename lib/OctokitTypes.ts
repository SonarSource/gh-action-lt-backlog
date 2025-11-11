/*
 * Backlog Automation
 * Copyright (C) 2022-2025 SonarSource Sàrl
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

import { components } from '@octokit/openapi-types/types.d';

export type IssueComment = components["schemas"]["issue-comment"];
export type Issue = components["schemas"]["issue"];
export type PullRequest = components['schemas']['pull-request'] & {
  // Declare extensions for the underlaying type. We can't modify the prototype, unfortunately. 
  isRenovate(): boolean;
  isDependabot(): boolean;
};

export function addPullRequestExtensions(pr: components['schemas']['pull-request']): PullRequest {  // Adds implementation of declared extensions
  return {
    ...pr,
    isRenovate(): boolean {
      return this.user.login === "renovate[bot]";
    },
    isDependabot(): boolean {
      return this.user.login === "dependabot[bot]";
    }
  };
}

