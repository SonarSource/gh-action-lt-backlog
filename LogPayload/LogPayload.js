"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const Action_1 = require("../lib/Action");
class LogPayload extends Action_1.Action {
    execute() {
        return __awaiter(this, void 0, void 0, function* () {
            this.log("--- Event payload ---");
            this.log(this.serializeToString(this.payload));
            this.log("----------");
        });
    }
}
const action = new LogPayload();
action.run();
//# sourceMappingURL=LogPayload.js.map