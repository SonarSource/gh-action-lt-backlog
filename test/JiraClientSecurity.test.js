import { afterEach, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert';
import { JiraClient } from '../src/helpers/JiraClient.js';
import { LogTester } from './support/LogTester.js';

describe('JiraClient security boundaries', () => {
  let originalFetch;
  let logTester;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    logTester = new LogTester();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    logTester.afterEach();
  });

  it('encodes issue keys used in request paths', async () => {
    const client = new JiraClient(
      'https://jira.example.com',
      'site',
      'organization',
      'user',
      'token',
    );
    let requestedUrl;
    globalThis.fetch = async url => {
      requestedUrl = url;
      return new Response('{}');
    };

    await client.addIssueRemoteLink('GHA-42/../../admin\r\nforged', 'https://example.com');

    assert.strictEqual(requestedUrl.origin, 'https://jira.example.com');
    assert.strictEqual(
      requestedUrl.pathname,
      '/rest/api/3/issue/GHA-42%2F..%2F..%2Fadmin%0D%0Aforged/remotelink',
    );
    assert.strictEqual(
      logTester.logsParams[0],
      'GHA-42/../../admin  forged: Adding remote link https://example.com',
    );
  });

  it('rejects request paths that change the configured origin', async () => {
    const client = new JiraClient(
      'https://jira.example.com',
      'site',
      'organization',
      'user',
      'token',
    );

    await assert.rejects(
      client.sendRequest('GET', '//attacker.example.com/collect'),
      /configured domain/,
    );
  });

  it('rejects non-HTTPS Jira domains', () => {
    assert.throws(
      () => new JiraClient('http://jira.example.com', 'site', 'organization', 'user', 'token'),
      /must use HTTPS/,
    );
  });
});
