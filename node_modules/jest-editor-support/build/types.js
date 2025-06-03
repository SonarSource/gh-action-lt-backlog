"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessageTypes = void 0;
var MessageTypes;
(function (MessageTypes) {
    MessageTypes[MessageTypes["noTests"] = 1] = "noTests";
    MessageTypes[MessageTypes["testResults"] = 3] = "testResults";
    MessageTypes[MessageTypes["unknown"] = 0] = "unknown";
    MessageTypes[MessageTypes["watchUsage"] = 2] = "watchUsage";
})(MessageTypes || (exports.MessageTypes = MessageTypes = {}));
