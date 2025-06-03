"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Process_1 = require("./Process");
function parseSettings(text, debug = false) {
    var _a;
    const jsonPattern = /^[\s]*\{/gm;
    let jestConfig;
    try {
        jestConfig = JSON.parse(text);
    }
    catch (err) {
        const idx = text.search(jsonPattern);
        if (idx > 0) {
            if (debug) {
                console.log(`skip config output noise: ${text.substring(0, idx)}`);
            }
            return parseSettings(text.substring(idx));
        }
        console.warn(`failed to parse config: \n${text}\nerror:`, err);
        throw err;
    }
    const parts = (_a = jestConfig.version) === null || _a === void 0 ? void 0 : _a.split('.');
    if (!parts || parts.length === 0) {
        throw new Error(`Jest version is not a valid semver version: ${jestConfig.version}`);
    }
    const jestVersionMajor = parseInt(parts[0], 10);
    if (debug) {
        console.log(`found config jestVersionMajor=${jestVersionMajor}`);
    }
    return {
        jestVersionMajor,
        configs: Array.isArray(jestConfig.configs) ? jestConfig.configs : [jestConfig.config],
    };
}
function getSettings(workspace, options) {
    return new Promise((resolve, reject) => {
        var _a, _b;
        const cp = (options && options.createProcess) || Process_1.createProcess;
        const childProcess = cp(workspace, ['--showConfig']);
        let configString = '';
        (_a = childProcess.stdout) === null || _a === void 0 ? void 0 : _a.on('data', (data) => {
            configString += data.toString();
        });
        let rejected = false;
        (_b = childProcess.stderr) === null || _b === void 0 ? void 0 : _b.on('data', (data) => {
            rejected = true;
            reject(data.toString());
        });
        childProcess.on('close', () => {
            if (!rejected) {
                try {
                    resolve(parseSettings(configString, workspace.debug));
                }
                catch (err) {
                    reject(err);
                }
            }
        });
    });
}
exports.default = getSettings;
