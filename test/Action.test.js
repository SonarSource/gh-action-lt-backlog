import { afterEach, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert';
import { Action } from '../src/helpers/Action.js';
import { LogTester } from './support/LogTester.js';

describe('Action', () => {
  let logTester;

  beforeEach(() => {
    logTester = new LogTester();
    process.env['GITHUB_REPOSITORY'] = 'test-owner/test-repo';
  });

  afterEach(() => {
    logTester.afterEach();
  });

  it('prevents log injection through line breaks', () => {
    const action = new Action();

    action.log('first\r\nforged\u2028line');

    assert.deepStrictEqual(logTester.logsParams, ['first  forged line']);
  });
});
