"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const child_process_1 = require("child_process");
const fs_1 = require("fs");
const os_1 = require("os");
const path = __importStar(require("path"));
const events_1 = __importDefault(require("events"));
const types_1 = require("./types");
const Process_1 = require("./Process");
class Runner extends events_1.default {
    constructor(workspace, options) {
        super();
        this.watchMode = false;
        this.watchAll = false;
        this._createProcess = (options && options.createProcess) || Process_1.createProcess;
        this.options = options || {};
        this.workspace = workspace;
        this.outputPath = path.join((0, os_1.tmpdir)(), `jest_runner_${this.workspace.outputFileSuffix || ''}.json`);
        this.prevMessageTypes = [];
        this._exited = false;
    }
    __convertDashedArgs(args) {
        if (!this.workspace.useDashedArgs) {
            return args;
        }
        return args.map((arg) => arg && arg.startsWith('--') && arg.length > 2 ? arg.replace(/(\B)([A-Z])/gm, '-$2').toLowerCase() : arg);
    }
    _getArgs() {
        if (this.options.args && this.options.args.replace) {
            return this.options.args.skipConversion
                ? this.options.args.args
                : this.__convertDashedArgs(this.options.args.args);
        }
        const belowEighteen = this.workspace.localJestMajorVersion < 18;
        const outputArg = belowEighteen ? '--jsonOutputFile' : '--outputFile';
        let args = ['--testLocationInResults', '--json', '--useStderr', outputArg, this.outputPath];
        if (this.watchMode) {
            args.push(this.watchAll ? '--watchAll' : '--watch');
        }
        if (this.options.testNamePattern) {
            args.push('--testNamePattern', this.options.testNamePattern);
        }
        if (this.options.testFileNamePattern) {
            args.push(this.options.testFileNamePattern);
        }
        if (this.workspace.collectCoverage === true) {
            args.push('--coverage');
        }
        if (this.workspace.collectCoverage === false) {
            args.push('--no-coverage');
        }
        if (this.options.noColor === true) {
            args.push('--no-color');
        }
        if (this.options.reporters) {
            this.options.reporters.forEach((reporter) => {
                args.push('--reporters', reporter);
            });
        }
        if (this.options.args) {
            args.push(...this.options.args.args);
        }
        args = this.__convertDashedArgs(args);
        return args;
    }
    start(watchMode = true, watchAll = false) {
        var _a, _b;
        if (this.runProcess) {
            return;
        }
        this.watchMode = watchMode;
        this.watchAll = watchAll;
        const args = this._getArgs();
        const childProcess = this._createProcess(this.workspace, args);
        this.runProcess = childProcess;
        (_a = childProcess.stdout) === null || _a === void 0 ? void 0 : _a.on('data', (data) => {
            this._parseOutput(data, false);
        });
        (_b = childProcess.stderr) === null || _b === void 0 ? void 0 : _b.on('data', (data) => {
            this._parseOutput(data, true);
        });
        childProcess.on('exit', (code, signal) => {
            this._exited = true;
            this.emit('debuggerProcessExit');
            this.emit('processExit', code, signal);
            this.prevMessageTypes.length = 0;
        });
        childProcess.on('error', (error) => {
            this.emit('terminalError', `Process failed: ${error.message}`);
            this.prevMessageTypes.length = 0;
        });
        childProcess.on('close', (code, signal) => {
            this.emit('debuggerProcessExit');
            this.emit('processClose', code, signal);
            this.prevMessageTypes.length = 0;
        });
    }
    _parseOutput(data, isStdErr) {
        const msgType = this.findMessageType(data);
        switch (msgType) {
            case types_1.MessageTypes.testResults:
                this.emit('executableStdErr', data, {
                    type: msgType,
                });
                (0, fs_1.readFile)(this.outputPath, 'utf8', (err, _data) => {
                    if (err) {
                        const message = `JSON report not found at ${this.outputPath}`;
                        this.emit('terminalError', message);
                    }
                    else {
                        const noTestsFound = this.doResultsFollowNoTestsFoundMessage();
                        this.emit('executableJSON', JSON.parse(_data), {
                            noTestsFound,
                        });
                    }
                });
                this.prevMessageTypes.length = 0;
                break;
            case types_1.MessageTypes.watchUsage:
            case types_1.MessageTypes.noTests:
                this.prevMessageTypes.push(msgType);
                this.emit('executableStdErr', data, {
                    type: msgType,
                });
                break;
            default:
                if (isStdErr) {
                    this.emit('executableStdErr', data, {
                        type: msgType,
                    });
                }
                else {
                    this.emit('executableOutput', data.toString().replace('[2J[H', ''));
                }
                this.prevMessageTypes.length = 0;
                break;
        }
        return msgType;
    }
    runJestWithUpdateForSnapshots(completion, args) {
        const defaultArgs = ['--updateSnapshot'];
        const updateProcess = this._createProcess(this.workspace, [...defaultArgs, ...(args || [])]);
        updateProcess.on('close', () => {
            completion();
        });
    }
    closeProcess() {
        var _a, _b, _c;
        if (!((_a = this.runProcess) === null || _a === void 0 ? void 0 : _a.pid) || this._exited) {
            console.log(`process has not started or already exited`);
            return;
        }
        if (process.platform === 'win32') {
            (0, child_process_1.spawn)('taskkill', ['/pid', `${this.runProcess.pid}`, '/T', '/F']);
        }
        else {
            try {
                process.kill(-this.runProcess.pid);
            }
            catch (e) {
                console.warn(`failed to kill process group, this could leave some orphan process whose ppid=${((_b = this.runProcess) === null || _b === void 0 ? void 0 : _b.pid) || 'process-non-exist'}. error=`, e);
                (_c = this.runProcess) === null || _c === void 0 ? void 0 : _c.kill();
            }
        }
        this.runProcess = undefined;
    }
    findMessageType(buf) {
        const noTestRegex = /No tests found related to files changed since ((last commit)|("[a-z0-9]+"))./;
        const watchUsageRegex = /^\s*Watch Usage\b/;
        const testResultsRegex = /Test results written to/;
        const checks = [
            { regex: testResultsRegex, messageType: types_1.MessageTypes.testResults },
            { regex: noTestRegex, messageType: types_1.MessageTypes.noTests },
            { regex: watchUsageRegex, messageType: types_1.MessageTypes.watchUsage },
        ];
        const str = buf.toString('utf8');
        const match = checks.find(({ regex }) => regex.test(str));
        return match ? match.messageType : types_1.MessageTypes.unknown;
    }
    doResultsFollowNoTestsFoundMessage() {
        if (this.prevMessageTypes.length === 1) {
            return this.prevMessageTypes[0] === types_1.MessageTypes.noTests;
        }
        if (this.prevMessageTypes.length === 2) {
            return this.prevMessageTypes[0] === types_1.MessageTypes.noTests && this.prevMessageTypes[1] === types_1.MessageTypes.watchUsage;
        }
        return false;
    }
}
exports.default = Runner;
