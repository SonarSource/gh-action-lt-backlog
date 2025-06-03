"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.parse = exports.getASTfor = void 0;
const fs_1 = require("fs");
const t = __importStar(require("@babel/types"));
const parser = __importStar(require("@babel/parser"));
const parser_nodes_1 = require("./parser_nodes");
const parser_nodes_2 = require("./parser_nodes");
const helper_1 = require("./helper");
const _getASTfor = (file, data, options) => {
    const _data = data || (0, fs_1.readFileSync)(file).toString();
    const config = Object.assign(Object.assign({}, (options || {})), { sourceType: 'module' });
    return [parser.parse(_data, config), _data];
};
const getASTfor = (file, data, options) => {
    const [bFile] = _getASTfor(file, data, (0, helper_1.parseOptions)(file, options));
    return bFile;
};
exports.getASTfor = getASTfor;
const isFunctionExpression = (node) => t.isArrowFunctionExpression(node) || t.isFunctionExpression(node);
const parse = (file, data, options) => {
    const parseResult = new parser_nodes_2.ParseResult(file);
    const [ast, _data] = _getASTfor(file, data, options);
    const updateNameInfo = (nBlock, bNode, lastProperty) => {
        if (!t.isExpressionStatement(bNode) || !t.isCallExpression(bNode.expression)) {
            throw new Error(`Expected an ExpressionStatement with CallExpression but got: ${JSON.stringify(bNode)}`);
        }
        const arg = bNode.expression.arguments[0];
        const value = arg.value;
        if (typeof value === 'string') {
            nBlock.name = value;
        }
        else {
            if (arg.start && arg.end) {
                switch (arg.type) {
                    case 'TemplateLiteral':
                        nBlock.name = _data.substring(arg.start + 1, arg.end - 1);
                        break;
                    default:
                        nBlock.name = _data.substring(arg.start, arg.end);
                        break;
                }
            }
            else {
                console.warn(`Unable to find name start/end position: ${JSON.stringify(arg)}`);
                nBlock.name = '';
            }
        }
        nBlock.nameType = arg.type;
        nBlock.lastProperty = lastProperty;
        if (arg.loc) {
            nBlock.nameRange = new parser_nodes_2.ParsedRange(arg.loc.start.line, arg.loc.start.column + 2, arg.loc.end.line, arg.loc.end.column - 1);
        }
    };
    const updateNode = (node, babelNode, lastProperty) => {
        var _a, _b;
        node.start = (_a = babelNode.loc) === null || _a === void 0 ? void 0 : _a.start;
        node.end = (_b = babelNode.loc) === null || _b === void 0 ? void 0 : _b.end;
        if (node.start) {
            node.start.column += 1;
        }
        parseResult.addNode(node);
        if (node instanceof parser_nodes_2.NamedBlock) {
            updateNameInfo(node, babelNode, lastProperty);
        }
    };
    const isAnIt = (name) => {
        return name === 'it' || name === 'fit' || name === 'test';
    };
    const isAnDescribe = (name) => {
        return name === 'describe';
    };
    const isAnExpect = (node) => {
        const expression = (0, helper_1.getCallExpression)(node);
        if (!expression) {
            return false;
        }
        let name = '';
        let element = expression.callee;
        while (!name && element) {
            name = element.name;
            element = element.object || element.callee;
        }
        return name === 'expect';
    };
    const addNode = (type, parent, babylonNode, lastProperty) => {
        const child = parent.addChild(type);
        updateNode(child, babylonNode, lastProperty);
        if (child instanceof parser_nodes_2.NamedBlock && child.name == null) {
            console.warn(`block is missing name: ${JSON.stringify(babylonNode)}`);
        }
        return child;
    };
    const searchNodes = (parentNode, parentParsedNode) => {
        if (!parentNode) {
            return;
        }
        let body = (0, helper_1.shallowAttr)(parentNode, 'body');
        if (!body || !Array.isArray(body)) {
            return;
        }
        let child;
        body.forEach((element) => {
            child = undefined;
            const [name, lastProperty] = (0, helper_1.getNameForNode)(element);
            if (isAnDescribe(name)) {
                child = addNode(parser_nodes_1.ParsedNodeType.describe, parentParsedNode, element, lastProperty);
            }
            else if (isAnIt(name)) {
                child = addNode(parser_nodes_1.ParsedNodeType.it, parentParsedNode, element, lastProperty);
            }
            else if (isAnExpect(element)) {
                child = addNode(parser_nodes_1.ParsedNodeType.expect, parentParsedNode, element);
            }
            else if (t.isVariableDeclaration(element)) {
                element.declarations
                    .filter((declaration) => {
                    const ret = declaration.init && isFunctionExpression(declaration.init);
                    return ret;
                })
                    .forEach((declaration) => {
                    const ret = searchNodes((0, helper_1.shallowAttr)(declaration, 'init', 'body'), parentParsedNode);
                    return ret;
                });
            }
            else if (t.isExpressionStatement(element) &&
                t.isAssignmentExpression(element.expression) &&
                isFunctionExpression(element.expression.right)) {
                body = (0, helper_1.shallowAttr)(element.expression, 'right', 'body');
                searchNodes(body, parentParsedNode);
            }
            else if (t.isReturnStatement(element)) {
                const args = (0, helper_1.shallowAttr)(element.argument, 'arguments');
                if (args && Array.isArray(args)) {
                    args
                        .filter((arg) => isFunctionExpression(arg))
                        .forEach((argument) => searchNodes((0, helper_1.shallowAttr)(argument, 'body'), parentParsedNode));
                }
            }
            const expression = (0, helper_1.getCallExpression)(element);
            if (expression) {
                expression.arguments.forEach((argument) => searchNodes((0, helper_1.shallowAttr)(argument, 'body'), child !== null && child !== void 0 ? child : parentParsedNode));
            }
        });
    };
    const { program } = ast;
    searchNodes(program, parseResult.root);
    return parseResult;
};
exports.parse = parse;
