import { afterEach, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert';
import * as github from '@actions/github';
import { LogTester } from '../support/LogTester.js';
import { LogPayload } from '../../src/LogPayload.js';
describe('LogPayload', () => {
  let logTester;
  beforeEach(() => {
    logTester = new LogTester();
    process.env['GITHUB_REPOSITORY'] = 'test-owner/test-repo';
    process.env['INPUT_GITHUB-TOKEN'] = 'fake';
  });
  afterEach(() => {
    logTester?.afterEach(); // When beforeAll fails, beforeEach is not called, but afterEach is.
  });
  it('Log payload as-is', async () => {
    github.context.payload = {
      pull_request: {
        number: 42,
        title: 'PR Title',
      },
      sender: {
        login: 'test-user',
        type: 'User',
      },
    };
    const action = new LogPayload();
    await action.run();
    assert.deepStrictEqual(logTester.logsParams, [
      '--- Event payload ---',
      '{   "pull_request": {     "number": 42,     "title": "PR Title"   },   "sender": {     "login": "test-user",     "type": "User"   } }',
      '----------',
      'Done',
    ]);
  });
});
