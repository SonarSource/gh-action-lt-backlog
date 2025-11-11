"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.LogTester = void 0;
// This should be created `beforeEach` unit test to:
// * Unify console.log assertions
// * Suppress console.log noise from successful tests. Each console.log produces 5 lines in UT output, making it too hard to work with.
// `afterEach` should be called to restore mocking and to dump logs for failed UTs.
class LogTester {
    logSpy;
    logsParams = [];
    constructor() {
        this.logSpy = jest.spyOn(console, 'log').mockImplementation((...args) => this.logsParams.push(...args));
    }
    afterEach() {
        const console = jest.requireActual('console');
        const state = expect.getState();
        if (state.assertionCalls === 0 || state.numPassingAsserts !== state.assertionCalls) {
            console.log(`--- Console log for: ${state.currentTestName} ---`);
            this.dump();
            console.log();
        }
        this.mockRestore();
    }
    dump() {
        const console = jest.requireActual('console');
        for (const params of this.logsParams) {
            console.log(params);
        }
    }
    mockRestore() {
        this.logSpy.mockRestore();
    }
}
exports.LogTester = LogTester;
//# sourceMappingURL=LogTester.js.map