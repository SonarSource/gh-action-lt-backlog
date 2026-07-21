import { afterEach, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert';
import * as github from '@actions/github';
import { ImportIssue } from '../../src/ImportIssue.js';
import { LogTester } from '../support/LogTester.js';
import { jiraClientStub } from '../support/JiraClientStub.js';
import { createOctokitRestStub } from '../support/OctokitRestStub.js';
async function runAction(title, label) {
  process.env['INPUT_JIRA-PROJECT'] = 'GHA';
  github.context.payload = {
    issue: {
      number: 42,
      title,
      labels: [{ name: label }],
      body: 'Lorem Ipsum',
      html_url: 'https://www.github.com/test-owner/test-repo/issues/42',
    },
  };
  const action = new ImportIssue();
  action.jira = jiraClientStub;
  action.rest = createOctokitRestStub(title, 'Lorem Ipsum');
  await action.run();
}
describe('ImportIssue', () => {
  let logTester;
  beforeEach(() => {
    logTester = new LogTester();
    process.env['GITHUB_REPOSITORY'] = 'test-owner/test-repo';
    process.env['INPUT_GITHUB-TOKEN'] = 'fake';
  });
  afterEach(() => {
    logTester?.afterEach(); // When beforeAll fails, beforeEach is not called, but afterEach is.
  });
  it('Already imported skips the action', async () => {
    await runAction('GHA-42 Already imported', 'Irrelevant label');
    assert.deepStrictEqual(logTester.logsParams, ['Done']);
  });
  for (const { label, type } of [
    { label: 'Bug', type: 'Bug' },
    { label: 'CFG/SE FPs', type: 'False Positive' },
    { label: 'False Negative', type: 'False Negative' },
    { label: 'False Positive', type: 'False Positive' },
    { label: 'Rule Idea', type: 'Feature' },
    { label: 'Whatever unexpected', type: 'Feature' }, // Default fallback
  ]) {
    it(`Import issue type from label ${label} => ${type}`, async () => {
      await runAction('New issue', label);
      assert.deepStrictEqual(logTester.logsParams, [
        'Importing #42',
        `Invoked jira.createIssue('GHA', 'New issue', {"issuetype":{"name":"${type}"},"description":{"type":"doc","version":1,"content":[{"type":"paragraph","content":[{"type":"text","text":"Lorem Ipsum"}]}]}})`,
        'Created Jira issue',
        "Invoked jira.addIssueRemoteLink('GHA-4242'', 'https://www.github.com/test-owner/test-repo/issues/42', null)",
        'Updating issue #42 title to: GHA-4242 New issue',
        'Invoked rest.issues.update({"owner":"test-owner","repo":"test-repo","issue_number":42,"title":"GHA-4242 New issue"})',
        `Invoked jira.createComponent('GHA', '${label}', 'null')`,
        `Invoked jira.addIssueComponent('GHA-4242', '${label}')`,
        'Invoked rest.issues.createComment({"owner":"test-owner","repo":"test-repo","issue_number":42,"body":"Internal ticket [GHA-4242](https://sonarsource.atlassian.net/browse/GHA-4242)"})',
        'Done',
      ]);
    });
  }
});
