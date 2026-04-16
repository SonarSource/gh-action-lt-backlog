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
const ImportIssue_1 = require("./ImportIssue");
const LogTester_1 = require("../tests/LogTester");
const JiraClientStub_1 = require("../tests/JiraClientStub");
const OctokitRestStub_1 = require("../tests/OctokitRestStub");
async function runAction(title, label) {
    process.env['INPUT_JIRA-PROJECT'] = 'GHA';
    github.context.payload = {
        issue: {
            number: 42,
            title,
            labels: [{ name: label }],
            body: 'Lorem Ipsum',
            html_url: "https://www.github.com/test-owner/test-repo/issues/42"
        }
    };
    const action = new ImportIssue_1.ImportIssue();
    action.jira = JiraClientStub_1.jiraClientStub;
    action.rest = (0, OctokitRestStub_1.createOctokitRestStub)(title, "Lorem Ipsum");
    await action.run();
}
describe('ImportIssue', () => {
    let logTester;
    beforeEach(() => {
        logTester = new LogTester_1.LogTester();
        process.env['GITHUB_REPOSITORY'] = 'test-owner/test-repo';
        process.env['INPUT_GITHUB-TOKEN'] = 'fake';
    });
    afterEach(() => {
        logTester?.afterEach(); // When beforeAll fails, beforeEach is not called, but afterEach is.
    });
    it('Already imported skips the action', async () => {
        await runAction('GHA-42 Already imported', 'Irrelevant label');
        expect(logTester.logsParams).toStrictEqual(["Done"]);
    });
    it('Import issue type from label', async () => {
        const map = [
            { name: 'Bug', type: 'Bug' },
            { name: 'CFG/SE FPs', type: 'False Positive' },
            { name: 'False Negative', type: 'False Negative' },
            { name: 'False Positive', type: 'False Positive' },
            { name: 'Rule Idea', type: 'New Feature' },
            // Default fallback
            { name: 'Whatever unexpected label', type: 'Improvement' },
        ];
        for (const item of map) {
            await runAction('New issue', item.name);
            expect(logTester.logsParams).toStrictEqual([
                "Importing #42",
                `Invoked jira.createIssue('GHA', 'New issue', {"issuetype":{"name":"${item.type}"},"description":{"type":"doc","version":1,"content":[{"type":"paragraph","content":[{"type":"text","text":"Lorem Ipsum"}]}]}})`,
                "Created GHA-4242",
                "Invoked jira.addIssueRemoteLink('GHA-4242'', 'https://www.github.com/test-owner/test-repo/issues/42', null)",
                "Updating issue #42 title to: GHA-4242 New issue",
                "Invoked rest.issues.update({\"owner\":\"test-owner\",\"repo\":\"test-repo\",\"issue_number\":42,\"title\":\"GHA-4242 New issue\"})",
                `Invoked jira.createComponent('GHA', '${item.name}', 'null')`,
                `Invoked jira.addIssueComponent('GHA-4242', '${item.name}')`,
                "Invoked rest.issues.createComment({\"owner\":\"test-owner\",\"repo\":\"test-repo\",\"issue_number\":42,\"body\":\"Internal ticket [GHA-4242](https://sonarsource.atlassian.net/browse/GHA-4242)\"})",
                "Done",
            ]);
            logTester.logsParams = [];
        }
    });
});
//# sourceMappingURL=ImportIssue.test.js.map