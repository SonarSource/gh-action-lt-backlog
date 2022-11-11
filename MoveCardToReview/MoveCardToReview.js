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
const PullRequestAction_1 = require("../lib/PullRequestAction");
class MoveCardToReview extends PullRequestAction_1.PullRequestAction {
    processReassignment(issue) {
        return __awaiter(this, void 0, void 0, function* () {
            if (issue.state === "open") {
                yield this.reassignIssue(issue, this.payload.requested_reviewer.login);
            }
        });
    }
}
const action = new MoveCardToReview();
action.run();
//# sourceMappingURL=MoveCardToReview.js.map