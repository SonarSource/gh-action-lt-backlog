"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const TeamConfiguration_1 = require("../Data/TeamConfiguration");
const expect_1 = require("expect");
const NewIssueData_1 = require("../lib/NewIssueData");
const jiraClient = {
    async loadIssue(issueId) {
        switch (issueId) {
            case 'MMF-1111': return { key: 'MMF-1111', fields: { project: { key: 'MMF' }, issuetype: { name: 'Epic' } } };
            case 'KEY-1111': return { key: 'KEY-1111', fields: { project: { key: 'KEY' }, issuetype: { name: 'Epic' } } };
            case 'KEY-1234': return { key: 'KEY-1234', fields: { project: { key: 'KEY' }, issuetype: { name: 'Task' } } };
            case 'KEY-5555': return { key: 'KEY-5555', fields: { project: { key: 'KEY' }, issuetype: { name: 'Sub-task' } } };
            default: throw new Error(`Scaffolding did not expect ${issueId}`);
        }
    },
    async loadProject(projectKey) {
        return projectKey === 'KEY'
            ? { lead: { accountId: '1234-account', displayName: 'Project Lead' } }
            : { lead: { accountId: '2222-no-team', displayName: 'Project Lead Without team' } };
    },
    async findAccountId(email) {
        switch (email) {
            case 'user@sonarsource.com': return '1234-account';
            case 'eng.exp@sonarsource.com': return '3333-eng-exp-account';
            case 'renovate@renovate.com': return null;
            case 'dependabot@dependabot.com': return null;
            default: throw new Error(`Scaffolding did not expect email ${email}`);
        }
    },
    async findTeamByUser(accountId) {
        switch (accountId) {
            case '1234-account': return { name: '.NET Squad', id: 'dot-neeet-team' };
            case '2222-no-team': return null;
            case '3333-eng-exp-account': return TeamConfiguration_1.EngineeringExperienceSquad;
            default: throw new Error(`Scaffolding did not expect accountId ${accountId}`);
        }
        ;
    },
    async findTeamByName(accountId) {
        switch (accountId) {
            case 'fallback-team': return { name: 'Analysis Processing Squad', id: 'fallback-team' };
            default: throw new Error(`Scaffolding did not expect team name ${accountId}`);
        }
    },
    async findSprintId(boardId) {
        return 42;
    }
};
function createPullRequest(title, body, repo = 'repo') {
    return {
        number: 42,
        title,
        body,
        base: { repo: { name: repo } },
        isRenovate() { return title === 'Renovate PR'; },
        isDependabot() { return title === 'Dependabot PR'; }
    };
}
function createExpected() {
    return {
        accountId: '1234-account',
        additionalFields: {
            customfield_10001: 'dot-neeet-team',
            customfield_10020: 42,
            issuetype: { name: 'Task' }
        },
        projectKey: 'KEY'
    };
}
function createExpectedWithoutAccount() {
    return {
        accountId: null,
        additionalFields: {
            customfield_10001: 'dot-neeet-team',
            customfield_10020: 42,
            issuetype: { name: 'Task' }
        },
        projectKey: 'KEY'
    };
}
describe('NewIssueData', () => {
    it('create standalone PR', async () => {
        (0, expect_1.expect)(await NewIssueData_1.NewIssueData.create(jiraClient, createPullRequest('Title', 'Body'), 'KEY', '', 'user@sonarsource.com', '')).toEqual(createExpected());
    });
    it('create fixed issue', async () => {
        (0, expect_1.expect)(await NewIssueData_1.NewIssueData.create(jiraClient, createPullRequest('KEY-1234 Title', 'Body'), 'KEY', '', 'user@sonarsource.com', '')).toEqual(createExpected());
    });
    it('create projectKey parent Epic MMF', async () => {
        const expected = {
            accountId: '1234-account',
            additionalFields: {
                customfield_10001: 'dot-neeet-team',
                customfield_10020: 42,
                issuetype: { name: 'Task' },
                parent: { key: 'MMF-1111' },
            },
            projectKey: 'KEY'
        };
        (0, expect_1.expect)(await NewIssueData_1.NewIssueData.create(jiraClient, createPullRequest('Title', 'Part of Epic MMF-1111'), 'KEY', '', 'user@sonarsource.com', '')).toEqual(expected);
    });
    it('create projectKey parent Epic project', async () => {
        const expected = {
            accountId: '1234-account',
            additionalFields: {
                customfield_10001: 'dot-neeet-team',
                customfield_10020: 42,
                issuetype: { name: 'Task' },
                parent: { key: 'KEY-1111' },
            },
            projectKey: 'KEY'
        };
        (0, expect_1.expect)(await NewIssueData_1.NewIssueData.create(jiraClient, createPullRequest('Title', 'Part of Epic KEY-1111'), 'KEY', '', 'user@sonarsource.com', '')).toEqual(expected);
    });
    it('create projectKey parent Sub-task', async () => {
        (0, expect_1.expect)(await NewIssueData_1.NewIssueData.create(jiraClient, createPullRequest('Title', 'Part of Sub-task KEY-5555'), 'KEY', '', 'user@sonarsource.com', '')).toEqual(createExpected());
    });
    it('create projectKey parent Issue', async () => {
        const expected = {
            accountId: '1234-account',
            additionalFields: {
                // No team or sprint for Sub=task
                issuetype: { name: 'Sub-task' },
                parent: { key: 'KEY-1234' },
            },
            projectKey: 'KEY'
        };
        (0, expect_1.expect)(await NewIssueData_1.NewIssueData.create(jiraClient, createPullRequest('Title', 'Part of Task KEY-1234'), 'KEY', '', 'user@sonarsource.com', '')).toEqual(expected);
    });
    it('create projectKey not configured standalone PR', async () => {
        // RSPEC repo without parent ticket
        (0, expect_1.expect)(await NewIssueData_1.NewIssueData.create(jiraClient, createPullRequest('Title', 'Body'), '', '', 'user@sonarsource.com', '')).toBeNull();
    });
    it('create projectKey not configured with parent', async () => {
        const expected = {
            accountId: '1234-account',
            additionalFields: {
                // No team or sprint for Sub-task
                issuetype: { name: 'Sub-task' },
                parent: { key: 'KEY-1234' },
            },
            projectKey: 'KEY'
        };
        (0, expect_1.expect)(await NewIssueData_1.NewIssueData.create(jiraClient, createPullRequest('Title', 'Part of Task KEY-1234'), '', '', 'user@sonarsource.com', '')).toEqual(expected);
    });
    it('create with additional fields', async () => {
        const expected = {
            accountId: '1234-account',
            additionalFields: {
                components: [{ name: 'Some Component' }],
                customfield_10001: 'dot-neeet-team',
                customfield_10020: 42,
                labels: ['SomeLabel'],
                issuetype: { name: 'Task' }
            },
            projectKey: 'KEY'
        };
        (0, expect_1.expect)(await NewIssueData_1.NewIssueData.create(jiraClient, createPullRequest('Title', 'Body'), 'KEY', '{ "components": [ { "name": "Some Component" } ], "labels": ["SomeLabel"] }', 'user@sonarsource.com', '')).toEqual(expected);
    });
    it('create with additional fields custom issue type', async () => {
        const expected = createExpected();
        expected.additionalFields.issuetype.name = 'Custom Issue Type';
        (0, expect_1.expect)(await NewIssueData_1.NewIssueData.create(jiraClient, createPullRequest('Title', 'Body'), 'KEY', '{ "issuetype": { "name": "Custom Issue Type" } }', 'user@sonarsource.com', '')).toEqual(expected);
    });
    it('create renovate ignores parent', async () => {
        (0, expect_1.expect)(await NewIssueData_1.NewIssueData.create(jiraClient, createPullRequest('Renovate PR', 'FOREIGN-1234 and NET-1111'), 'KEY', '', 'renovate@renovate.com', '')).toEqual(createExpectedWithoutAccount());
    });
    it('create dependabot ignores parent', async () => {
        (0, expect_1.expect)(await NewIssueData_1.NewIssueData.create(jiraClient, createPullRequest('Dependabot PR', 'FOREIGN-1234 and NET-1111'), 'KEY', '', 'dependabot@dependabot.com', '')).toEqual(createExpectedWithoutAccount());
    });
    it('create with fallbackTeam', async () => {
        const expected = {
            accountId: null,
            additionalFields: {
                customfield_10001: 'fallback-team',
                customfield_10020: 42,
                issuetype: { name: 'Task' }
            },
            projectKey: 'KEY'
        };
        (0, expect_1.expect)(await NewIssueData_1.NewIssueData.create(jiraClient, createPullRequest('Renovate PR', 'Body'), 'KEY', '', 'renovate@renovate.com', 'fallback-team')).toEqual(expected);
    });
    it('create with project lead team', async () => {
        (0, expect_1.expect)(await NewIssueData_1.NewIssueData.create(jiraClient, createPullRequest('Renovate PR', 'Body'), 'KEY', '', 'renovate@renovate.com', '')).toEqual(createExpectedWithoutAccount());
    });
    it('create with no team', async () => {
        const expected = {
            accountId: null,
            additionalFields: {
                // No team, no sprint
                issuetype: { name: 'Task' }
            },
            projectKey: 'NOTEAM'
        };
        (0, expect_1.expect)(await NewIssueData_1.NewIssueData.create(jiraClient, createPullRequest('Renovate PR', 'Body'), 'NOTEAM', '', 'renovate@renovate.com', '')).toEqual(expected);
    });
    it('createForEngExp internal contributor', async () => {
        const expected = {
            accountId: '3333-eng-exp-account',
            additionalFields: {
                customfield_10001: 'eb40f25e-3596-4541-b661-cf83e7bc4fa6',
                customfield_10020: 42,
                issuetype: { name: 'Task' },
                labels: ['dvi-created-by-automation'],
                reporter: { id: '3333-eng-exp-account' }
            },
            projectKey: 'BUILD'
        };
        (0, expect_1.expect)(await NewIssueData_1.NewIssueData.createForEngExp(jiraClient, createPullRequest('Title', 'Body'), 'eng.exp@sonarsource.com')).toEqual(expected);
    });
    it('createForEngExp external contributor', async () => {
        const expected = {
            accountId: '1234-account',
            additionalFields: {
                customfield_10001: 'eb40f25e-3596-4541-b661-cf83e7bc4fa6',
                customfield_10020: 42,
                issuetype: { name: 'Task' },
                labels: ['dvi-created-by-automation'],
                reporter: { id: '1234-account' }
            },
            projectKey: 'PREQ'
        };
        (0, expect_1.expect)(await NewIssueData_1.NewIssueData.createForEngExp(jiraClient, createPullRequest('Title', 'Body'), 'user@sonarsource.com')).toEqual(expected);
    });
    it('createForEngExp renovate', async () => {
        const expected = {
            accountId: null,
            additionalFields: {
                customfield_10001: 'eb40f25e-3596-4541-b661-cf83e7bc4fa6',
                customfield_10020: 42,
                issuetype: { name: 'Task' },
                labels: ['dvi-created-by-automation', 'dvi-renovate']
            },
            projectKey: 'BUILD'
        };
        (0, expect_1.expect)(await NewIssueData_1.NewIssueData.createForEngExp(jiraClient, createPullRequest('Renovate PR', 'Body'), 'renovate@renovate.com')).toEqual(expected);
    });
    it('createForEngExp parent-oss project', async () => {
        const expected = {
            accountId: '1234-account',
            additionalFields: {
                customfield_10001: 'eb40f25e-3596-4541-b661-cf83e7bc4fa6',
                customfield_10020: 42,
                issuetype: { name: 'Task' },
                labels: ['dvi-created-by-automation'],
                reporter: { id: '1234-account' }
            },
            projectKey: 'PARENTOSS'
        };
        (0, expect_1.expect)(await NewIssueData_1.NewIssueData.createForEngExp(jiraClient, createPullRequest('Title', 'Body', 'parent-oss'), 'user@sonarsource.com')).toEqual(expected);
    });
});
//# sourceMappingURL=NewIssueData.test.js.map