"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const JiraClient_1 = require("./JiraClient");
let sut;
beforeAll(() => {
    sut = new JiraClient_1.JiraClient("user", "token");
});
describe('JiraClient', () => {
    it('handles errors', async () => {
        const withoutToken = new JiraClient_1.JiraClient("wrong", "token");
        const result = await withoutToken.loadIssue("TEST-42");
        expect(result).toBeNull();
        //await expect(async () => {
        //  await withoutToken.loadIssue("TEST-42");
        //}).toThrow("FIXME");
    });
    it.skip('createIssue', () => {
        // FIXME
    });
    it.skip('loadIssue', () => {
        // FIXME
    });
    it.skip('createIssue', () => {
        // FIXME
    });
    it.skip('loadProject', () => {
        // FIXME
    });
    it.skip('findTransition', () => {
        // FIXME
    });
    it.skip('transitionIssue', () => {
        // FIXME
    });
    it.skip('assignIssueToEmail', () => {
        // FIXME
    });
    it.skip('assignIssueToAccount', () => {
        // FIXME
    });
    it.skip('addReviewer', () => {
        // FIXME
    });
    it.skip('addReviewedBy', () => {
        // FIXME
    });
    it.skip('addIssueComponent', () => {
        // FIXME
    });
    it.skip('addIssueRemoteLink', () => {
        // FIXME
    });
    it.skip('findAccountId', () => {
        // FIXME
    });
    it.skip('findSprintId', () => {
        // FIXME
    });
    it.skip('findTeam', () => {
        // FIXME
    });
    it.skip('createComponent', () => {
        // FIXME
    });
});
//# sourceMappingURL=JiraClient.test.js.map