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
const OctokitRestStub_1 = require("../tests/OctokitRestStub");
const RequestReview_1 = require("./RequestReview");
const JiraClientStub_1 = require("../tests/JiraClientStub");
describe('RequestReview', () => {
    const originalKeys = Object.keys(process.env);
    let logTester;
    beforeEach(() => {
        logTester = new LogTester_1.LogTester();
        for (const key of Object.keys(process.env)) {
            if (!originalKeys.includes(key)) {
                // Otherwise, changes form previous UT are propagated to the next one
                delete process.env[key];
            }
        }
        process.env['GITHUB_REPOSITORY'] = 'test-owner/test-repo';
        process.env['INPUT_GITHUB-TOKEN'] = 'fake';
        github.context.payload = {
            pull_request: {
                number: 42,
                title: "PR Title",
            },
            requested_reviewer: {
                login: "test-user",
                type: "User",
            },
            sender: {
                login: 'test-user',
                type: "User"
            }
        };
    });
    afterEach(() => {
        logTester.afterEach();
    });
    // This is just a smoke test to make sure the other components works together. Details are tested in their respective classes
    it('Processes all issues in title', async () => {
        const sut = new RequestReview_1.RequestReview();
        sut.jira = JiraClientStub_1.jiraClientStub;
        sut.rest = (0, OctokitRestStub_1.createOctokitRestStub)("GHA-42 and GHA-43");
        sut.findEmail = async function (login) {
            return "user@sonarsource.com";
        };
        await sut.run();
        expect(logTester.logsParams).toStrictEqual([
            "Loading PR #42",
            "Invoked jira.moveIssue('GHA-42', 'Request Review', null)",
            "Invoked jira.assignIssueToEmail('GHA-42', 'user@sonarsource.com')",
            "Invoked jira.moveIssue('GHA-43', 'Request Review', null)",
            "Invoked jira.assignIssueToEmail('GHA-43', 'user@sonarsource.com')",
            "Done",
        ]);
    });
});
//# sourceMappingURL=RequestReview.test.js.map