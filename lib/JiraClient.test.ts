import { JiraClient } from './JiraClient';

let sut: JiraClient;

beforeAll(() => {
  sut = new JiraClient("user", "token");
});

describe('JiraClient', () => {
  it('handles errors', async () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => { });
    const withoutToken = new JiraClient("wrong", "token");
    const result = await withoutToken.loadIssue("TEST-42");
    expect(result).toBeNull();
    expect(logSpy).toHaveBeenCalledWith('404 (Not Found): Issue does not exist or you do not have permission to see it.');
    expect(logSpy).toHaveBeenCalledWith(`{
  "errorMessages": [
    "Issue does not exist or you do not have permission to see it."
  ],
  "errors": {}
}`);
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