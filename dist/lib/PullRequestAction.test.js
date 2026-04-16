"use strict";
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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const github = __importStar(require("@actions/github"));
const LogTester_1 = require("../tests/LogTester");
const OctokitRestStub_1 = require("../tests/OctokitRestStub");
const PullRequestAction_1 = require("./PullRequestAction");
class TestPullRequestAction extends PullRequestAction_1.PullRequestAction {
    constructor(title, login) {
        super();
        this.rest = (0, OctokitRestStub_1.createOctokitRestStub)(title, null, login);
    }
    async processJiraIssue(issueId) {
        this.log(`Invoked processJiraIssue(${issueId})`);
    }
}
describe('PullRequestAction', () => {
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
            sender: {
                login: 'test-user',
                type: "User"
            }
        };
    });
    afterEach(() => {
        logTester?.afterEach(); // When beforeAll fails, beforeEach is not called, but afterEach is.
    });
    it('No issue ID', async () => {
        const sut = new TestPullRequestAction("Standalone PR");
        await sut.run();
        expect(logTester.logsParams).toStrictEqual([
            "Loading PR #42",
            "No Jira issue found in the PR title.",
            "Done",
        ]);
    });
    it('Process all title issue IDs', async () => {
        const sut = new TestPullRequestAction("GHA-42, [GHA-43] And also SCAN4NET-44 with number in project key, but no lowercase-22");
        await sut.run();
        expect(logTester.logsParams).toStrictEqual([
            "Loading PR #42",
            "Invoked processJiraIssue(GHA-42)",
            "Invoked processJiraIssue(GHA-43)",
            "Invoked processJiraIssue(SCAN4NET-44)",
            "Done",
        ]);
    });
    it('Process renovate issue ID', async () => {
        const sut = new TestPullRequestAction("Renovate PR with ID in comment", "renovate[bot]");
        sut.rest.issues.listComments = function (params) {
            return {
                data: [
                    { body: "Renovate Jira issue ID: GHA-42" }
                ]
            };
        };
        await sut.run();
        expect(logTester.logsParams).toStrictEqual([
            "Loading PR #42",
            "Invoked processJiraIssue(GHA-42)",
            "Done"
        ]);
    });
    it('Ignore BUILD and PREQ', async () => {
        const sut = new TestPullRequestAction("GHA-42 is processed but BUILD-42 and PREQ-43 are ignored");
        await sut.run();
        expect(logTester.logsParams).toStrictEqual([
            "Loading PR #42",
            "Invoked processJiraIssue(GHA-42)",
            "Skipping BUILD-42",
            "Skipping PREQ-43",
            "Done"
        ]);
    });
    it('Process BUILD and PREQ for is-eng-xp-squad', async () => {
        const sut = new TestPullRequestAction("BUILD-42 and PREQ-43 are processed");
        sut.isEngXpSquad = true;
        await sut.run();
        expect(logTester.logsParams).toStrictEqual([
            "Loading PR #42",
            "Invoked processJiraIssue(BUILD-42)",
            "Invoked processJiraIssue(PREQ-43)",
            "Done",
        ]);
    });
});
//# sourceMappingURL=PullRequestAction.test.js.map