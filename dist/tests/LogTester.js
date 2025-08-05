"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LogTester = void 0;
// This should be created `beforeEach` unit test to:
// * Unify console.log assertions
// * Supress console.log noise from successful tests. Each console.log produces 5 lines in UT output, making it too hard to work with.
// `afterEach` should be called to restore mocking and to dump logs for failed UTs.
class LogTester {
    logSpy;
    logsParams = [];
    constructor() {
        this.logSpy = jest.spyOn(console, 'log').mockImplementation((...args) => this.logsParams.push(...args));
    }
    afterEach() {
        const console = jest.requireActual('console');
        const state = expect.getState();
        if (state.assertionCalls === 0 || state.numPassingAsserts !== state.assertionCalls) {
            console.log(`--- Console log for: ${state.currentTestName} ---`);
            this.dump();
            console.log();
        }
        this.mockRestore();
    }
    dump() {
        const console = jest.requireActual('console');
        for (const params of this.logsParams) {
            console.log(params);
        }
    }
    mockRestore() {
        this.logSpy.mockRestore();
    }
}
exports.LogTester = LogTester;
//# sourceMappingURL=LogTester.js.map