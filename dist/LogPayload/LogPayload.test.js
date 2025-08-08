"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const github = require("@actions/github");
const LogTester_1 = require("../tests/LogTester");
const LogPayload_1 = require("./LogPayload");
describe('LogPayload', () => {
    let logTester;
    beforeEach(() => {
        logTester = new LogTester_1.LogTester();
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
        const action = new LogPayload_1.LogPayload();
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
//# sourceMappingURL=LogPayload.test.js.map