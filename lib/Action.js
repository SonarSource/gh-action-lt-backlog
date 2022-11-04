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
exports.Action = void 0;
const core = require("@actions/core");
const github = require("@actions/github");
class Action {
    constructor() {
        this.context = github.context;
        this.repo = github.context.repo;
        this.payload = github.context.payload;
    }
    run() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield this.execute();
                this.log("Done");
            }
            catch (ex) {
                core.setFailed(ex.message);
            }
        });
    }
    log(line) {
        console.log(line);
    }
    addRepo(other) {
        return Object.assign(Object.assign({}, this.repo), other);
    }
    serializeToString(value) {
        return JSON.stringify(value, undefined, 2);
    }
}
exports.Action = Action;
//# sourceMappingURL=Action.js.map