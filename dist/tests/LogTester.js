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
import { expect, onTestFailed, vi } from 'vitest';
// This should be created `beforeEach` unit test to:
// * Unify console.log assertions
// * Suppress console.log noise from successful tests. Each console.log produces 5 lines in UT output, making it too hard to work with.
// `afterEach` should be called to restore mocking and to dump logs for failed UTs.
export class LogTester {
    logSpy;
    logsParams = [];
    originalLog = console.log.bind(console);
    constructor() {
        this.logSpy = vi.spyOn(console, 'log').mockImplementation((...args) => this.logsParams.push(...args));
        onTestFailed(() => {
            this.originalLog(`--- Console log for: ${expect.getState().currentTestName} ---`);
            this.dump();
            this.originalLog();
        });
    }
    afterEach() {
        this.mockRestore();
    }
    dump() {
        for (const params of this.logsParams) {
            this.originalLog(params);
        }
    }
    mockRestore() {
        this.logSpy.mockRestore();
    }
}
//# sourceMappingURL=LogTester.js.map