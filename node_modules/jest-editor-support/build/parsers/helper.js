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
exports.getNameForNode = exports.getCallExpression = exports.shallowAttr = exports.isFunctionExpression = exports.parseOptions = exports.tsxPlugins = exports.tsPlugins = exports.jsPlugins = exports.DefaultDecoratorPlugin = void 0;
const t = __importStar(require("@babel/types"));
const commonPlugins = [
    'asyncDoExpressions',
    'asyncGenerators',
    'bigInt',
    'classPrivateMethods',
    'classPrivateProperties',
    'classProperties',
    'classStaticBlock',
    'decimal',
    'decoratorAutoAccessors',
    'destructuringPrivate',
    'doExpressions',
    'dynamicImport',
    'explicitResourceManagement',
    'exportDefaultFrom',
    'exportNamespaceFrom',
    'flowComments',
    'functionBind',
    'functionSent',
    'importMeta',
    'logicalAssignment',
    'importAssertions',
    'importReflection',
    'moduleBlocks',
    'moduleStringNames',
    'nullishCoalescingOperator',
    'numericSeparator',
    'objectRestSpread',
    'optionalCatchBinding',
    'optionalChaining',
    'partialApplication',
    'privateIn',
    'regexpUnicodeSets',
    'throwExpressions',
    'topLevelAwait',
    'v8intrinsic',
    ['pipelineOperator', { proposal: 'smart' }],
    'recordAndTuple',
];
exports.DefaultDecoratorPlugin = ['decorators', { decoratorsBeforeExport: true }];
exports.jsPlugins = [...commonPlugins, 'flow', 'jsx'];
exports.tsPlugins = [...commonPlugins, 'typescript'];
exports.tsxPlugins = [...commonPlugins, 'typescript', 'jsx'];
const parseOptions = (filePath, options) => {
    const optionalPlugins = () => {
        var _a, _b;
        if (!((_a = options === null || options === void 0 ? void 0 : options.plugins) === null || _a === void 0 ? void 0 : _a.decorators)) {
            return [exports.DefaultDecoratorPlugin];
        }
        if (((_b = options.plugins) === null || _b === void 0 ? void 0 : _b.decorators) === 'legacy') {
            return ['decorators-legacy'];
        }
        return [['decorators', options.plugins.decorators]];
    };
    if (filePath.match(/\.ts$/i)) {
        return { plugins: [...exports.tsPlugins, ...optionalPlugins()] };
    }
    if (filePath.match(/\.tsx$/i)) {
        return { plugins: [...exports.tsxPlugins, ...optionalPlugins()] };
    }
    if (!(options === null || options === void 0 ? void 0 : options.strictMode) || filePath.match(/\.m?jsx?$/i)) {
        return { plugins: [...exports.jsPlugins, ...optionalPlugins()] };
    }
    throw new TypeError(`unable to find parser options for unrecognized file extension: ${filePath}`);
};
exports.parseOptions = parseOptions;
const isFunctionExpression = (node) => t.isArrowFunctionExpression(node) || t.isFunctionExpression(node);
exports.isFunctionExpression = isFunctionExpression;
const getNodeAttribute = (node, isDeep, ...attributes) => {
    if (!node) {
        return;
    }
    const value = node;
    return attributes.reduce((aNode, attr) => {
        if (!aNode || !aNode[attr]) {
            return;
        }
        let n = aNode;
        if (isDeep) {
            while (n[attr]) {
                n = n[attr];
            }
            return n;
        }
        return n[attr];
    }, value);
};
const shallowAttr = (node, ...attributes) => getNodeAttribute(node, false, ...attributes);
exports.shallowAttr = shallowAttr;
const deepAttr = (node, ...attributes) => getNodeAttribute(node, true, ...attributes);
const getCallExpression = (node) => {
    if (t.isExpressionStatement(node)) {
        if (t.isCallExpression(node.expression)) {
            return node.expression;
        }
    }
    else if (t.isCallExpression(node)) {
        return node;
    }
};
exports.getCallExpression = getCallExpression;
const getNameForNode = (node) => {
    const expression = (0, exports.getCallExpression)(node);
    const rootCallee = deepAttr(expression, 'callee');
    if (rootCallee) {
        const attrs = ['property', 'name'];
        const lastProperty = (0, exports.shallowAttr)(rootCallee, ...attrs) || (0, exports.shallowAttr)(deepAttr(rootCallee, 'tag'), ...attrs);
        const name = (0, exports.shallowAttr)(rootCallee, 'name') ||
            (0, exports.shallowAttr)(deepAttr(rootCallee, 'object'), 'name') ||
            (0, exports.shallowAttr)(deepAttr(rootCallee, 'tag', 'object'), 'name');
        return [name, lastProperty];
    }
    return [];
};
exports.getNameForNode = getNameForNode;
