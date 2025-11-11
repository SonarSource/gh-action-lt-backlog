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
const SubmitReview_1 = require("./SubmitReview");
const JiraClientStub_1 = require("../tests/JiraClientStub");
async function runAction(state, findEmailResult = null) {
    github.context.payload = {
        pull_request: {
            number: 42,
            title: "GHA-42 and GHA-43 are processed",
        },
        requested_reviewer: {
            login: "test-user",
            type: "User",
        },
        review: {
            state
        },
        sender: {
            login: 'test-user',
            type: "User"
        }
    };
    const action = new SubmitReview_1.SubmitReview();
    action.jira = JiraClientStub_1.jiraClientStub;
    action.rest = (0, OctokitRestStub_1.createOctokitRestStub)('GHA-42 and GHA-43 are processed');
    action.findEmail = async function (login) {
        return findEmailResult;
    };
    await action.run();
}
describe('SubmitReview', () => {
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
    });
    afterEach(() => {
        logTester.afterEach();
    });
    it('Commented does nothing', async () => {
        await runAction('commented');
        expect(logTester.logsParams).toStrictEqual([
            "Loading PR #42",
            "Done",
        ]);
    });
    it('Request Changes moves issue', async () => {
        await runAction('changes_requested');
        expect(logTester.logsParams).toStrictEqual([
            "Loading PR #42",
            "Invoked jira.moveIssue('GHA-42', 'Request Changes', null)",
            "Invoked jira.moveIssue('GHA-43', 'Request Changes', null)",
            "Done",
        ]);
    });
    it('Approved moves issue', async () => {
        await runAction('approved');
        expect(logTester.logsParams).toStrictEqual([
            "Loading PR #42",
            "Invoked jira.moveIssue('GHA-42', 'Approve', null)",
            "Invoked jira.moveIssue('GHA-43', 'Approve', null)",
            "Done",
        ]);
    });
    it('Approved is-eng-xp-squad adds ReviewedBy', async () => {
        process.env['INPUT_IS-ENG-XP-SQUAD'] = 'true';
        await runAction('approved', 'user@sonarsource.com');
        expect(logTester.logsParams).toStrictEqual([
            "Loading PR #42",
            "Invoked jira.addReviewedBy('GHA-42', 'user@sonarsource.com')",
            "Invoked jira.addReviewedBy('GHA-43', 'user@sonarsource.com')",
            "Done",
        ]);
    });
    it('Approved is-eng-xp-squad unknown email', async () => {
        process.env['INPUT_IS-ENG-XP-SQUAD'] = 'true';
        await runAction('approved', null);
        expect(logTester.logsParams).toStrictEqual([
            "Loading PR #42",
            "Done",
        ]);
    });
});
//# sourceMappingURL=SubmitReview.test.js.map