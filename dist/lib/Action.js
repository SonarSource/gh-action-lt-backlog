"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Action = void 0;
const core = require("@actions/core");
const github = require("@actions/github");
class Action {
    constructor() {
        this.context = github.context;
        this.repo = github.context.repo;
        this.payload = github.context.payload;
    }
    async run() {
        try {
            await this.execute();
            this.log('Done');
        }
        catch (ex) {
            core.setFailed(ex.message);
        }
    }
    log(line) {
        console.log(line);
    }
    logSerialized(value) {
        console.log(this.serializeToString(value));
    }
    addRepo(other) {
        return { ...this.repo, ...other };
    }
    serializeToString(value) {
        return JSON.stringify(value, undefined, 2);
    }
}
exports.Action = Action;
//# sourceMappingURL=Action.js.map