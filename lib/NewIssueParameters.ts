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

import { AtlassianDocument } from "./AtlassianDocumentFormat";

// New fields of this interface should be tested via JiraClient.test.ts / createIssue
export interface NewIssueParameters {
    issuetype: { name: string; };
    labels?: string[];
    parent?: { key: string; };
    reporter?: { id: string; };
    description?: AtlassianDocument;
    customfield_10001?: string; // This is how Patlassian* named teamId in Jira
    customfield_10020?: number; // How would you name a sprintId? Oh, I know...
}
