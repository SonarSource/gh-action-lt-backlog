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
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { PrepareRelease } from './PrepareRelease.js';
import { LogTester } from '../tests/LogTester.js';
import { createOctokitRestStub } from '../tests/OctokitRestStub.js';
function issue(key, assignee) {
    const account = assignee ? { accountId: assignee, emailAddress: `${assignee}@x.com`, displayName: assignee } : null;
    return { key, fields: { assignee: account } };
}
const link = (key) => `<https://sonarsource.atlassian.net/browse/${key}|${key}>`;
const defaultSlackId = (email) => `U-${email.split('@')[0]}`;
async function runAction(issues, currentlyLocked = false, resolveSlackId = defaultSlackId) {
    const pattern = process.env['INPUT_BRANCH-PATTERN'];
    const action = new PrepareRelease();
    action.findRule = async (pattern) => {
        console.log(`Invoked findRule(${pattern})`);
        return { id: 'rule-id', lockBranch: currentlyLocked, pattern };
    };
    action.updateRule = async (id, lockBranch) => {
        console.log(`Invoked updateRule(${id}, ${lockBranch})`);
        return { id, lockBranch, pattern };
    };
    action.cancelAutoMerge = async (pattern) => {
        console.log(`Invoked cancelAutoMerge(${pattern})`);
    };
    action.jira.findBoardIssues = async (boardId, jql) => {
        console.log(`Invoked findBoardIssues(${boardId}, ${jql})`);
        return issues;
    };
    action.findSlackUserId = async (email) => resolveSlackId(email);
    action.rest = createOctokitRestStub('Irrelevant');
    action.sendSlackPost = async (url, req) => {
        console.log(`Invoked sendSlackPost(${url}, ${JSON.stringify(req)})`);
        return {};
    };
    await action.run();
}
describe('PrepareRelease', () => {
    let logTester;
    beforeEach(() => {
        logTester = new LogTester();
        process.env['GITHUB_REPOSITORY'] = 'test-owner/test-repo';
        process.env['INPUT_GITHUB-TOKEN'] = 'fake';
        process.env['INPUT_JIRA-USER'] = 'fake';
        process.env['INPUT_JIRA-TOKEN'] = 'fake';
        process.env['INPUT_BOARD'] = 'CFamily Squad'; // boardId 173 in TeamConfigurationData
        process.env['INPUT_STATUS'] = 'In Validation';
        process.env['INPUT_BRANCH-PATTERN'] = 'master';
        process.env['INPUT_SLACK-CHANNEL'] = 'test-channel';
        process.env['INPUT_SLACK-TOKEN'] = 'fake';
    });
    afterEach(() => {
        logTester?.afterEach(); // When beforeAll fails, beforeEach is not called, but afterEach is.
    });
    it('Groups tickets by assignee and mentions them by Slack ID', async () => {
        await runAction([issue('ABC-1', 'Alice'), issue('ABC-2', 'Alice'), issue('ABC-3', 'Bob'), issue('ABC-4', null)]);
        expect(logTester.logsParams).toStrictEqual([
            "Invoked findRule(master)",
            "Invoked updateRule(rule-id, true)",
            "Board 'CFamily Squad' resolved to boardId 173",
            "Invoked findBoardIssues(173, status = \"In Validation\")",
            "Found 4 issue(s) in 'In Validation'",
            `Done: test-repo: The branch \`master\` was locked for release :ice_cube:\nTickets to validate:\n- <@U-Alice>\n  • ${link('ABC-1')}\n  • ${link('ABC-2')}\n- <@U-Bob>\n  • ${link('ABC-3')}\n- Unassigned\n  • ${link('ABC-4')}`,
            "Sending Slack message",
            `Invoked sendSlackPost(https://slack.com/api/chat.postMessage, {"channel":"test-channel","text":"test-repo: The branch \`master\` was locked for release :ice_cube:\\nTickets to validate:\\n- <@U-Alice>\\n  • ${link('ABC-1')}\\n  • ${link('ABC-2')}\\n- <@U-Bob>\\n  • ${link('ABC-3')}\\n- Unassigned\\n  • ${link('ABC-4')}"})`,
            "Done"
        ]);
    });
    it('Falls back to the display name when the assignee has no Slack account', async () => {
        await runAction([issue('ABC-1', 'Alice')], false, () => null);
        expect(logTester.logsParams).toStrictEqual([
            "Invoked findRule(master)",
            "Invoked updateRule(rule-id, true)",
            "Board 'CFamily Squad' resolved to boardId 173",
            "Invoked findBoardIssues(173, status = \"In Validation\")",
            "Found 1 issue(s) in 'In Validation'",
            `Done: test-repo: The branch \`master\` was locked for release :ice_cube:\nTickets to validate:\n- Alice\n  • ${link('ABC-1')}`,
            "Sending Slack message",
            `Invoked sendSlackPost(https://slack.com/api/chat.postMessage, {"channel":"test-channel","text":"test-repo: The branch \`master\` was locked for release :ice_cube:\\nTickets to validate:\\n- Alice\\n  • ${link('ABC-1')}"})`,
            "Done"
        ]);
    });
    it('Lists unassigned tickets', async () => {
        await runAction([issue('ABC-9', null)]);
        expect(logTester.logsParams).toStrictEqual([
            "Invoked findRule(master)",
            "Invoked updateRule(rule-id, true)",
            "Board 'CFamily Squad' resolved to boardId 173",
            "Invoked findBoardIssues(173, status = \"In Validation\")",
            "Found 1 issue(s) in 'In Validation'",
            `Done: test-repo: The branch \`master\` was locked for release :ice_cube:\nTickets to validate:\n- Unassigned\n  • ${link('ABC-9')}`,
            "Sending Slack message",
            `Invoked sendSlackPost(https://slack.com/api/chat.postMessage, {"channel":"test-channel","text":"test-repo: The branch \`master\` was locked for release :ice_cube:\\nTickets to validate:\\n- Unassigned\\n  • ${link('ABC-9')}"})`,
            "Done"
        ]);
    });
    it('Reports no tickets', async () => {
        await runAction([]);
        expect(logTester.logsParams).toStrictEqual([
            "Invoked findRule(master)",
            "Invoked updateRule(rule-id, true)",
            "Board 'CFamily Squad' resolved to boardId 173",
            "Invoked findBoardIssues(173, status = \"In Validation\")",
            "Found 0 issue(s) in 'In Validation'",
            "Done: test-repo: The branch `master` was locked for release :ice_cube:\nNo tickets to validate.",
            "Sending Slack message",
            "Invoked sendSlackPost(https://slack.com/api/chat.postMessage, {\"channel\":\"test-channel\",\"text\":\"test-repo: The branch `master` was locked for release :ice_cube:\\nNo tickets to validate.\"})",
            "Done"
        ]);
    });
    it('Uses the configured status', async () => {
        process.env['INPUT_STATUS'] = 'In Review';
        await runAction([issue('ABC-1', 'Alice')]);
        expect(logTester.logsParams).toStrictEqual([
            "Invoked findRule(master)",
            "Invoked updateRule(rule-id, true)",
            "Board 'CFamily Squad' resolved to boardId 173",
            "Invoked findBoardIssues(173, status = \"In Review\")",
            "Found 1 issue(s) in 'In Review'",
            `Done: test-repo: The branch \`master\` was locked for release :ice_cube:\nTickets to validate:\n- <@U-Alice>\n  • ${link('ABC-1')}`,
            "Sending Slack message",
            `Invoked sendSlackPost(https://slack.com/api/chat.postMessage, {"channel":"test-channel","text":"test-repo: The branch \`master\` was locked for release :ice_cube:\\nTickets to validate:\\n- <@U-Alice>\\n  • ${link('ABC-1')}"})`,
            "Done"
        ]);
    });
    it('Escapes quotes in the status for JQL', async () => {
        process.env['INPUT_STATUS'] = 'In "Validation"';
        await runAction([issue('ABC-1', 'Alice')]);
        expect(logTester.logsParams).toStrictEqual([
            "Invoked findRule(master)",
            "Invoked updateRule(rule-id, true)",
            "Board 'CFamily Squad' resolved to boardId 173",
            `Invoked findBoardIssues(173, status = "In \\"Validation\\"")`,
            `Found 1 issue(s) in 'In "Validation"'`,
            `Done: test-repo: The branch \`master\` was locked for release :ice_cube:\nTickets to validate:\n- <@U-Alice>\n  • ${link('ABC-1')}`,
            "Sending Slack message",
            `Invoked sendSlackPost(https://slack.com/api/chat.postMessage, {"channel":"test-channel","text":"test-repo: The branch \`master\` was locked for release :ice_cube:\\nTickets to validate:\\n- <@U-Alice>\\n  • ${link('ABC-1')}"})`,
            "Done"
        ]);
    });
    it('Does not post when the branch is already locked', async () => {
        await runAction([issue('ABC-1', 'Alice')], true);
        expect(logTester.logsParams).toStrictEqual([
            "Invoked findRule(master)",
            "The branch `master` is already locked.",
            "Done"
        ]);
    });
    it('Unknown board fails fast without locking or posting', async () => {
        process.env['INPUT_BOARD'] = 'Does Not Exist';
        await runAction([issue('ABC-1', 'Alice')]);
        expect(logTester.logsParams).toStrictEqual([
            "Done"
        ]);
    });
});
//# sourceMappingURL=PrepareRelease.test.js.map