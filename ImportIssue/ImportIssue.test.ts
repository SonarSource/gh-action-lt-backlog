import * as github from '@actions/github';
import { ImportIssue } from './ImportIssue';
import { LogTester } from '../tests/LogTester';
import { jiraClientStub } from '../tests/JiraClientStub';
import { createOctokitRestStub } from '../tests/OctokitRestStub';

async function runAction(title: string, label: string) {
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
  const action = new ImportIssue();
  (action as any).jira = jiraClientStub;
  (action as any).rest = createOctokitRestStub(title, "Lorem Ipsum");
  await action.run();
}

describe('ImportIssue', () => {
  let logTester: LogTester;

  beforeEach(() => {
    logTester = new LogTester();
    process.env['GITHUB_REPOSITORY'] = 'test-owner/test-repo';
    process.env['INPUT_GITHUB-TOKEN'] = 'fake';
  });

  afterEach(() => {
    logTester.afterEach();
  });

  it('Already imported skips the action', async () => {
    await runAction('GHA-42 Already imported', 'Irrelevant label');
    expect(logTester.logsParams).toStrictEqual(["Done"]);
  });

  it('Import issue type from label', async () => {
    type Item = { name: string, type: string };
    const map: Item[] = [
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
