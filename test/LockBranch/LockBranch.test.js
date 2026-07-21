import { afterEach, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert';
import { LockBranch } from '../../src/LockBranch.js';
import { LogTester } from '../support/LogTester.js';
import { createOctokitRestStub } from '../support/OctokitRestStub.js';
async function runAction(currentLockBranch) {
  const pattern = process.env['INPUT_BRANCH-PATTERN'];
  const action = new LockBranch();
  action.findRule = async pattern => {
    console.log(`Invoked findRule(${pattern})`);
    return { id: 'rule-id', lockBranch: currentLockBranch, pattern };
  };
  action.updateRule = async (id, lockBranch) => {
    console.log(`Invoked updateRule(${id}, ${lockBranch})`);
    return { id, lockBranch, pattern };
  };
  action.cancelAutoMerge = async pattern => {
    console.log(`Invoked cancelAutoMerge(${pattern})`);
  };
  action.rest = createOctokitRestStub('Irrelevant');
  action.sendSlackPost = async (url, req) => {
    console.log(`Invoked sendSlackPost`);
    return {};
  };
  await action.run();
}
describe('LockBranch', () => {
  let logTester;
  beforeEach(() => {
    logTester = new LogTester();
    process.env['GITHUB_REPOSITORY'] = 'test-owner/test-repo';
    process.env['INPUT_GITHUB-TOKEN'] = 'fake';
    process.env['INPUT_BRANCH-PATTERN'] = 'master';
    process.env['INPUT_SLACK-CHANNEL'] = '';
    process.env['INPUT_ADDITIONAL-MESSAGE'] = '';
  });
  afterEach(() => {
    logTester?.afterEach(); // When beforeAll fails, beforeEach is not called, but afterEach is.
  });
  it('Lock', async () => {
    process.env['INPUT_LOCK-BRANCH'] = 'true';
    await runAction(false);
    assert.deepStrictEqual(logTester.logsParams, [
      'Invoked findRule(master)',
      'Invoked updateRule(rule-id, true)',
      'Done: test-repo: The branch `master` was locked :ice_cube:',
      'Skip sending slack message, channel was not set.',
      'Done',
    ]);
  });
  it('Unlock', async () => {
    process.env['INPUT_LOCK-BRANCH'] = 'false';
    await runAction(true);
    assert.deepStrictEqual(logTester.logsParams, [
      'Invoked findRule(master)',
      'Invoked cancelAutoMerge(master)',
      'Invoked updateRule(rule-id, false)',
      'Done: test-repo: The branch `master` was unlocked and is now open for changes :sunny:',
      'Skip sending slack message, channel was not set.',
      'Done',
    ]);
  });
});
