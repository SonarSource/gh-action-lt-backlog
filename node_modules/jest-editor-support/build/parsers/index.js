"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const babel_parser_1 = require("./babel_parser");
const helper_1 = require("./helper");
function parse(filePath, serializedData, options) {
    return (0, babel_parser_1.parse)(filePath, serializedData, (0, helper_1.parseOptions)(filePath, options));
}
exports.default = parse;
