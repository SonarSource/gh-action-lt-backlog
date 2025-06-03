"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = __importDefault(require("path"));
class TestReconciler {
    constructor() {
        this.fileStatuses = {};
    }
    updateFileWithJestStatus(results) {
        const statusList = [];
        results.testResults.forEach((file) => {
            const status = this.statusToReconciliationState(file.status);
            const fileStatus = Object.assign(Object.assign({}, file), { file: file.name, assertions: this.mapAssertions(file.name, file.assertionResults), status });
            this.fileStatuses[file.name] = fileStatus;
            statusList.push(fileStatus);
        });
        return statusList;
    }
    removeTestFile(fileName) {
        delete this.fileStatuses[fileName];
    }
    mapAssertions(filename, assertions) {
        const convertJestLocation = (jestLocation) => {
            if (jestLocation) {
                jestLocation.line -= 1;
            }
            return jestLocation;
        };
        if (!assertions) {
            return [];
        }
        return assertions.map((assertion) => {
            var _a;
            const message = assertion.failureMessages && assertion.failureMessages[0];
            let short = undefined;
            let terse = undefined;
            let line = undefined;
            const location = convertJestLocation((_a = assertion.location) !== null && _a !== void 0 ? _a : undefined);
            if (message) {
                short = message.split('   at', 1)[0].trim();
                terse = this.sanitizeShortErrorMessage(short);
                line = this.lineOfError(message, filename);
            }
            return Object.assign(Object.assign({}, assertion), { line, message: message || '', shortMessage: short, status: this.statusToReconciliationState(assertion.status), terseMessage: terse, location });
        });
    }
    sanitizeShortErrorMessage(string) {
        if (string.includes('does not match stored snapshot')) {
            return 'Snapshot has changed';
        }
        if (string.includes('New snapshot was not written')) {
            return 'New snapshot is ready to write';
        }
        return string
            .split('\n')
            .splice(2)
            .join('')
            .replace(/\s\s+/g, ' ')
            .replace('Received:', ', Received:')
            .split('Difference:')[0];
    }
    lineOfError(message, filePath) {
        const filename = path_1.default.basename(filePath);
        const restOfTrace = message.split(filename, 2)[1];
        return restOfTrace ? parseInt(restOfTrace.split(':')[1], 10) : undefined;
    }
    statusToReconciliationState(status) {
        switch (status) {
            case 'passed':
                return 'KnownSuccess';
            case 'failed':
                return 'KnownFail';
            case 'pending':
                return 'KnownSkip';
            case 'todo':
                return 'KnownTodo';
            default:
                return 'Unknown';
        }
    }
    stateForTestFile(file) {
        const results = this.fileStatuses[file];
        if (!results) {
            return 'Unknown';
        }
        return results.status;
    }
    assertionsForTestFile(file) {
        const results = this.fileStatuses[file];
        return results ? results.assertions : null;
    }
    stateForTestAssertion(file, name) {
        const results = this.fileStatuses[file];
        if (!results || !results.assertions) {
            return null;
        }
        const assertion = results.assertions.find((a) => a.title === name);
        if (!assertion) {
            return null;
        }
        return assertion;
    }
}
exports.default = TestReconciler;
