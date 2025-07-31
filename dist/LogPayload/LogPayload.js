"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LogPayload = void 0;
const Action_1 = require("../lib/Action");
class LogPayload extends Action_1.Action {
    async execute() {
        this.log('--- Event payload ---');
        this.logSerialized(this.payload);
        this.log('----------');
    }
}
exports.LogPayload = LogPayload;
//# sourceMappingURL=LogPayload.js.map