"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createProjectWorkspace = void 0;
class ProjectWorkspace {
    get pathToJest() {
        console.warn('Use of ProjectWorkspace.pathToJest is deprecated.  Please use jestCommandLine instead.');
        return this.jestCommandLine;
    }
    set pathToJest(commandLine) {
        console.warn('Use of ProjectWorkspace.pathToJest is deprecated.  Please use jestCommandLine instead.');
        this.jestCommandLine = commandLine;
    }
    constructor(rootPath, jestCommandLine, pathToConfig, localJestMajorVersion, outputFileSuffix, collectCoverage, debug, nodeEnv, shell, useDashedArgs) {
        this.rootPath = rootPath;
        this.jestCommandLine = jestCommandLine;
        this.pathToConfig = pathToConfig;
        this.localJestMajorVersion = localJestMajorVersion;
        this.outputFileSuffix = outputFileSuffix ? outputFileSuffix.replace(/[^a-z0-9]/gi, '_').toLowerCase() : undefined;
        this.collectCoverage = collectCoverage;
        this.debug = debug;
        this.nodeEnv = nodeEnv;
        this.shell = shell;
        this.useDashedArgs = useDashedArgs;
    }
}
exports.default = ProjectWorkspace;
const createProjectWorkspace = (config) => {
    return new ProjectWorkspace(config.rootPath, config.jestCommandLine, config.pathToConfig, config.localJestMajorVersion, config.outputFileSuffix, config.collectCoverage, config.debug, config.nodeEnv, config.shell, config.useDashedArgs);
};
exports.createProjectWorkspace = createProjectWorkspace;
