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
const OctokitAction_1 = require("../lib/OctokitAction");
class CreateRspecIssue extends OctokitAction_1.OctokitAction {
    execute() {
        return __awaiter(this, void 0, void 0, function* () {
            this.log("Creating issue");
            yield this.octokit.rest.issues.create(this.addRepo({ title: `Update RSPEC before ${this.payload.milestone.title} release`, milestone: this.payload.milestone.number, labels: ["Type: Tooling"] }));
        });
    }
}
const action = new CreateRspecIssue();
action.run();
//# sourceMappingURL=index.js.map