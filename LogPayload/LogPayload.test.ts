import * as github from '@actions/github';
import { LogTester } from '../tests/LogTester';
import { LogPayload } from './LogPayload';

describe('LogPayload', () => {
  let logTester: LogTester;

  beforeEach(() => {
    logTester = new LogTester();
    process.env['GITHUB_REPOSITORY'] = 'test-owner/test-repo';
    process.env['INPUT_GITHUB-TOKEN'] = 'fake';
  });

  afterEach(() => {
    logTester.afterEach();
  });

  it('Log payload as-is', async () => {
    github.context.payload = {
      pull_request: {
        number: 42,
        title: "PR Title",
      },
      sender: {
        login: 'test-user',
        type: "User"
      }
    };
    const action = new LogPayload();
    await action.run();
    expect(logTester.logsParams).toStrictEqual([
         "--- Event payload ---",
        `{
  "pull_request": {
    "number": 42,
    "title": "PR Title"
  },
  "sender": {
    "login": "test-user",
    "type": "User"
  }
}`,
      "----------",
      "Done",
    ]);
  });
});
