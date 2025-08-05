
// This should be created `beforeEach` unit test to:
// * Unify console.log assertions
// * Supress console.log noise from successful tests. Each console.log produces 5 lines in UT output, making it too hard to work with.
// `afterEach` should be called to restore mocking and to dump logs for failed UTs.
export class LogTester {
  public readonly logSpy: jest.SpyInstance<void, [message?: any, ...optionalParams: any[]], any>;
  public logsParams: [message?: any, ...optionalParams: any[]][] = [];

  constructor() {
    this.logSpy = jest.spyOn(console, 'log').mockImplementation((...args) => this.logsParams.push(...args));
  }

  public afterEach() {
    const console = jest.requireActual('console');
    const state = expect.getState();
    if (state.assertionCalls === 0 || state.numPassingAsserts !== state.assertionCalls) {
      console.log(`--- Console log for: ${state.currentTestName} ---`);
      this.dump();
      console.log();
    }
    this.mockRestore();
  }

  public dump(): void {
    const console = jest.requireActual('console');
    for (const params of this.logsParams) {
      console.log(params);
    }
  }

  public mockRestore(): void {
    this.logSpy.mockRestore();
  }
}