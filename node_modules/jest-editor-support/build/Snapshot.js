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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const traverse_1 = __importDefault(require("@babel/traverse"));
const t = __importStar(require("@babel/types"));
const jest_snapshot_1 = require("jest-snapshot");
const utils = __importStar(require("@jest/snapshot-utils"));
const babel_parser_1 = require("./parsers/babel_parser");
const helper_1 = require("./parsers/helper");
const describeVariants = {
    describe: true,
    fdescribe: true,
    xdescribe: true,
};
const base = {
    describe: true,
    it: true,
    test: true,
};
const decorators = {
    only: true,
    skip: true,
};
const validParents = Object.assign(Object.assign(Object.assign({}, base), describeVariants), { fit: true, xit: true, xtest: true });
const isValidMemberExpression = (node) => t.isMemberExpression(node) &&
    t.isIdentifier(node.object) &&
    base[node.object.name] &&
    t.isIdentifier(node.property) &&
    decorators[node.property.name];
const isDescribe = (node) => (t.isIdentifier(node) && describeVariants[node.name]) || (t.isMemberExpression(node) && isDescribe(node.object));
const isValidParent = (parent) => t.isCallExpression(parent) &&
    ((t.isIdentifier(parent.callee) && validParents[parent.callee.name]) || isValidMemberExpression(parent.callee));
const getArrayOfParents = (path) => {
    const result = [];
    let parent = path.parentPath;
    while (parent) {
        result.unshift(parent.node);
        parent = parent.parentPath;
    }
    return result;
};
const buildName = (parents, position) => {
    const fullName = parents
        .map((parent) => {
        if (t.isCallExpression(parent) && parent.arguments.length > 0) {
            return (0, helper_1.shallowAttr)(parent.arguments[0], 'value');
        }
        console.warn(`Unexpected Snapshot parent type: ${JSON.stringify(parent)}`);
        return '';
    })
        .join(' ');
    return utils.testNameToKey(fullName, position);
};
class Snapshot {
    constructor(parser, customMatchers, projectConfig) {
        this._parser = parser || babel_parser_1.getASTfor;
        this._matchers = ['toMatchSnapshot', 'toThrowErrorMatchingSnapshot'].concat(customMatchers || []);
        this._projectConfig = projectConfig;
        this._resolverPromise = (0, jest_snapshot_1.buildSnapshotResolver)(this._projectConfig || {}, () => Promise.resolve()).then((resolver) => {
            this.snapshotResolver = resolver;
            return resolver;
        });
    }
    parse(filePath, options) {
        let fileNode;
        try {
            fileNode = this._parser(filePath, undefined, options === null || options === void 0 ? void 0 : options.parserOptions);
        }
        catch (error) {
            if (options === null || options === void 0 ? void 0 : options.verbose) {
                console.warn(error);
            }
            return [];
        }
        const found = [];
        (0, traverse_1.default)(fileNode, {
            enter: (path) => {
                if (path.isIdentifier() && this._matchers.indexOf(path.node.name) >= 0) {
                    found.push({
                        node: path.node,
                        parents: getArrayOfParents(path),
                    });
                }
            },
        });
        return found.map((f) => ({
            node: f.node,
            parents: f.parents.filter(isValidParent),
        }));
    }
    _getSnapshotResolver() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.snapshotResolver) {
                this.snapshotResolver = yield this._resolverPromise;
            }
            return this.snapshotResolver;
        });
    }
    getSnapshotContent(filePath, name) {
        return __awaiter(this, void 0, void 0, function* () {
            const snapshotResolver = yield this._getSnapshotResolver();
            const snapshotPath = snapshotResolver.resolveSnapshotPath(filePath);
            const snapshots = utils.getSnapshotData(snapshotPath, 'none').data;
            if (typeof name === 'string') {
                return snapshots[name];
            }
            const regex = name;
            const data = {};
            Object.entries(snapshots).forEach(([key, value]) => {
                if (regex.test(key)) {
                    data[key] = value;
                }
            });
            return Object.entries(data).length > 0 ? data : null;
        });
    }
    getMetadataAsync(filePath, options) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this._getSnapshotResolver();
            return this.getMetadata(filePath, options);
        });
    }
    getMetadata(filePath, options) {
        if (!this.snapshotResolver) {
            throw new Error('snapshotResolver is not ready yet, consider migrating to "getMetadataAsync" instead');
        }
        const snapshotPath = this.snapshotResolver.resolveSnapshotPath(filePath);
        const snapshotBlocks = this.parse(filePath, options);
        const snapshots = utils.getSnapshotData(snapshotPath, 'none').data;
        let lastParent = null;
        let count = 1;
        return snapshotBlocks.map((snapshotBlock) => {
            const { parents } = snapshotBlock;
            const innerAssertion = parents[parents.length - 1];
            if (lastParent !== innerAssertion) {
                lastParent = innerAssertion;
                count = 1;
            }
            const result = {
                content: undefined,
                exists: false,
                name: '',
                node: snapshotBlock.node,
            };
            if (!innerAssertion || (t.isCallExpression(innerAssertion) && isDescribe(innerAssertion.callee))) {
                return result;
            }
            result.name = buildName(parents, count);
            count += 1;
            if (snapshots[result.name]) {
                result.exists = true;
                result.content = snapshots[result.name];
            }
            return result;
        });
    }
}
exports.default = Snapshot;
