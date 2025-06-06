"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createProcess = void 0;
const child_process_1 = require("child_process");
const isLoginShell = (arg) => arg && typeof arg.path === 'string' && Array.isArray(arg.args);
const createProcess = (workspace, args) => {
    var _a;
    const runtimeExecutable = [workspace.jestCommandLine, ...args];
    if (workspace.pathToConfig) {
        runtimeExecutable.push('--config');
        runtimeExecutable.push(workspace.pathToConfig);
    }
    const env = Object.assign(Object.assign({}, process.env), ((_a = workspace.nodeEnv) !== null && _a !== void 0 ? _a : {}));
    const cmd = runtimeExecutable.join(' ');
    const spawnCommandLine = () => {
        const spawnOptions = {
            cwd: workspace.rootPath,
            env,
            shell: typeof workspace.shell === 'string' && workspace.shell ? workspace.shell : true,
            detached: process.platform !== 'win32',
        };
        if (workspace.debug) {
            console.log(`spawning process with command=${cmd}`, 'options:', spawnOptions);
        }
        return (0, child_process_1.spawn)(cmd, [], spawnOptions);
    };
    const spawnLoginShell = (shell) => {
        const spawnOptions = {
            cwd: workspace.rootPath,
            env,
            detached: process.platform !== 'win32',
        };
        if (workspace.debug) {
            console.log(`spawning login-shell "${shell.path} ${shell.args.join(' ')}" for command=${cmd}`, 'options:', spawnOptions);
        }
        const child = (0, child_process_1.spawn)(shell.path, shell.args, spawnOptions);
        child.stdin.write(`${cmd} \nexit $?\n`);
        return child;
    };
    if (isLoginShell(workspace.shell)) {
        if (process.platform === 'win32') {
            console.error('currently login-shell is only supported for non-windown platforms');
        }
        else {
            return spawnLoginShell(workspace.shell);
        }
    }
    return spawnCommandLine();
};
exports.createProcess = createProcess;
