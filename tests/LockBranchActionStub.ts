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

import type { ProtectionRule } from '../lib/LockBranchAction.js';

// This provides typed access to the private members of LockBranchAction for unit testing
export type LockBranchActionStub = {
  findRule(pattern: string): Promise<ProtectionRule | null>;
  updateRule(id: string, lockBranch: boolean): Promise<ProtectionRule>;
  cancelAutoMerge(pattern: string): Promise<void>;
};
