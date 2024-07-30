import { PullRequestCreated } from '../PullRequestCreated/PullRequestCreated'; // Adjust the import as necessary

jest.mock('../lib/OctokitAction');

describe('PullRequestCreated', () => {
  let action: PullRequestCreated;
  let mockGetPullRequest: jest.Mock;
  let mockCreateIssue: jest.Mock;
  let mockGetInput: jest.Mock;
  let mockUpdatePullRequestTitle: jest.Mock;
  let mockUpdatePullRequestDescription: jest.Mock;

  beforeEach(() => {
    action = new PullRequestCreated();
    mockGetPullRequest = jest.fn();
    mockCreateIssue = jest.fn();
    mockGetInput = jest.fn();
    mockUpdatePullRequestTitle = jest.fn();
    mockUpdatePullRequestDescription = jest.fn();

    (action as any).payload = {
      pull_request: {
        number: 1
      }
    };
    (action as any).getPullRequest = mockGetPullRequest;
    (action as any).getInput = mockGetInput;
    (action as any).jira = {
      createIssue: mockCreateIssue 
    };
    (action as any).updatePullRequestTitle = mockUpdatePullRequestTitle;
    (action as any).updatePullRequestDescription = mockUpdatePullRequestDescription;
  });

  it('should handle case when pr is null', async () => {
    mockGetPullRequest.mockResolvedValue(null);

    await (action as any).execute();

    expect(mockGetPullRequest).toHaveBeenCalled();
    expect(mockCreateIssue).not.toHaveBeenCalled();
    expect(mockUpdatePullRequestTitle).not.toHaveBeenCalled();
    expect(mockUpdatePullRequestDescription).not.toHaveBeenCalled();
  });

  it('should handle case when pr is not null and linkedIssues is null', async () => {
    const pr = { title: 'Test PR', body: 'Test body', number: 1 };
    mockGetPullRequest.mockResolvedValue(pr);
    mockCreateIssue.mockResolvedValue('JIRA-123');
    mockGetInput.mockReturnValue('JIRA');

    await (action as any).execute();

    expect(mockGetPullRequest).toHaveBeenCalled();
    expect(mockCreateIssue).toHaveBeenCalledWith('JIRA', 10002, 'Test PR');
    expect(mockUpdatePullRequestTitle).toHaveBeenCalledWith(1, 'JIRA-123 Test PR');
    expect(mockUpdatePullRequestDescription).toHaveBeenCalledWith(1, 'JIRA-123\n\nTest body');
  });

  it('should handle case when pr is not null and linkedIssues is not null', async () => {
    const pr = { title: 'Test PR JIRA-123', body: 'Test body', number: 1 };
    mockGetPullRequest.mockResolvedValue(pr);

    await (action as any).execute();

    expect(mockGetPullRequest).toHaveBeenCalled();
    expect(mockCreateIssue).not.toHaveBeenCalled();
    expect(mockUpdatePullRequestTitle).not.toHaveBeenCalled();
    expect(mockUpdatePullRequestDescription).toHaveBeenCalledWith(1, 'JIRA-123\n\nTest body');
  });
});
