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
const github = require("@actions/github");
const LogTester_1 = require("../tests/LogTester");
const LogPayload_1 = require("./LogPayload");
describe('LogPayload', () => {
    let logTester;
    beforeEach(() => {
        logTester = new LogTester_1.LogTester();
        process.env['GITHUB_REPOSITORY'] = 'test-owner/test-repo';
        process.env['INPUT_GITHUB-TOKEN'] = 'fake';
    });
    afterEach(() => {
        logTester.afterEach();
    });
    it('Log payload as-is', async () => {
        github.context.payload = {
            pull_request: {
                number: 42,
                title: "PR Title",
            },
            sender: {
                login: 'test-user',
                type: "User"
            }
        };
        const action = new LogPayload_1.LogPayload();
        await action.run();
        expect(logTester.logsParams).toStrictEqual([
            "--- Event payload ---",
            `{
  "pull_request": {
    "number": 42,
    "title": "PR Title"
  },
  "sender": {
    "login": "test-user",
    "type": "User"
  }
}`,
            "----------",
            "Done",
        ]);
    });
});
//# sourceMappingURL=LogPayload.test.js.map