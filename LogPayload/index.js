"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Action_1 = require("../lib/Action");
class LogPayload extends Action_1.Action {
    execute() {
        this.log("--- Event payload ---");
        this.log(this.serializeToString(this.payload));
        this.log("----------");
    }
}
const action = new LogPayload();
action.run();
//# sourceMappingURL=index.js.map