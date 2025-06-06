"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ParseResult = exports.DescribeBlock = exports.ItBlock = exports.NamedBlock = exports.Expect = exports.ParsedNode = exports.ParsedNodeType = exports.ParsedRange = void 0;
class ParsedRange {
    constructor(startLine, startCol, endLine, endCol) {
        this.start = { column: startCol, line: startLine };
        this.end = { column: endCol, line: endLine };
    }
}
exports.ParsedRange = ParsedRange;
var ParsedNodeType;
(function (ParsedNodeType) {
    ParsedNodeType["describe"] = "describe";
    ParsedNodeType["expect"] = "expect";
    ParsedNodeType["it"] = "it";
    ParsedNodeType["root"] = "root";
})(ParsedNodeType || (exports.ParsedNodeType = ParsedNodeType = {}));
class ParsedNode {
    constructor(type, file) {
        this.type = type;
        this.file = file;
    }
    addChild(type) {
        let child;
        switch (type) {
            case ParsedNodeType.describe:
                child = new DescribeBlock(this.file);
                break;
            case ParsedNodeType.it:
                child = new ItBlock(this.file);
                break;
            case ParsedNodeType.expect:
                child = new Expect(this.file);
                break;
            default:
                throw TypeError(`unexpected child node type: ${type}`);
        }
        if (!this.children) {
            this.children = [child];
        }
        else {
            this.children.push(child);
        }
        return child;
    }
    filter(f, filterSelf = false) {
        const filtered = [];
        const deepFilter = (node, _filterSelf) => {
            if (_filterSelf && f(node)) {
                filtered.push(node);
            }
            if (node.children) {
                node.children.forEach((c) => deepFilter(c, true));
            }
        };
        deepFilter(this, filterSelf);
        return filtered;
    }
}
exports.ParsedNode = ParsedNode;
class Expect extends ParsedNode {
    constructor(file) {
        super(ParsedNodeType.expect, file);
    }
}
exports.Expect = Expect;
class NamedBlock extends ParsedNode {
    constructor(type, file, name) {
        super(type, file);
        this.name = name !== null && name !== void 0 ? name : '';
    }
}
exports.NamedBlock = NamedBlock;
class ItBlock extends NamedBlock {
    constructor(file, name) {
        super(ParsedNodeType.it, file, name);
    }
}
exports.ItBlock = ItBlock;
class DescribeBlock extends NamedBlock {
    constructor(file, name) {
        super(ParsedNodeType.describe, file, name);
    }
}
exports.DescribeBlock = DescribeBlock;
class ParseResult {
    constructor(file) {
        this.file = file;
        this.root = new ParsedNode(ParsedNodeType.root, file);
        this.describeBlocks = [];
        this.expects = [];
        this.itBlocks = [];
    }
    addNode(node, dedup = false) {
        if (node instanceof DescribeBlock) {
            this.describeBlocks.push(node);
        }
        else if (node instanceof ItBlock) {
            this.itBlocks.push(node);
        }
        else if (node instanceof Expect) {
            if (dedup &&
                this.expects.some((e) => { var _a, _b, _c, _d; return ((_a = e.start) === null || _a === void 0 ? void 0 : _a.line) === ((_b = node.start) === null || _b === void 0 ? void 0 : _b.line) && ((_c = e.start) === null || _c === void 0 ? void 0 : _c.column) === ((_d = node.start) === null || _d === void 0 ? void 0 : _d.column); })) {
                return;
            }
            this.expects.push(node);
        }
        else {
            throw new TypeError(`unexpected node class '${typeof node}': ${JSON.stringify(node)}`);
        }
    }
}
exports.ParseResult = ParseResult;
