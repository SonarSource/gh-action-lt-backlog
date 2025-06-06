"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdfNode = exports.AtlassianDocument = void 0;
const MarkdownParser_1 = require("./MarkdownParser");
const MarkdownTextParser_1 = require("./MarkdownTextParser");
class AtlassianDocument {
    type = 'doc';
    version = 1;
    content;
    constructor(content) {
        this.content = content;
    }
    static fromUrl(url) {
        return new AtlassianDocument([
            {
                type: 'paragraph',
                content: [
                    {
                        type: 'inlineCard',
                        attrs: { url }
                    }
                ]
            }
        ]);
    }
    static fromMarkdown(markdown) {
        const contents = [];
        const parser = new MarkdownParser_1.MarkdownParser(markdown);
        let block;
        while (block = parser.readBlock()) {
            contents.push(new AdfNode(block));
        }
        this.normalizeHeadings(contents);
        return new AtlassianDocument(contents);
    }
    static normalizeHeadings(nodes) {
        const headings = nodes.filter(x => x.type === 'heading');
        if (headings.length > 0) {
            const min = headings.reduce((min, x) => Math.min(min, x.attrs.level), 6);
            for (const node of headings) {
                node.attrs.level -= min - 1; // Normalize to start from 1
            }
        }
    }
}
exports.AtlassianDocument = AtlassianDocument;
class AdfNode {
    type;
    content;
    attrs;
    marks;
    text;
    constructor(block = null) {
        if (block) {
            this.type = block.type;
            switch (block.type) {
                case 'heading': {
                    const level = block.text.indexOf(' ');
                    this.attrs = { level };
                    this.content = AdfNode.parseText(block.text.substring(level + 1));
                    break;
                }
                case 'blockquote': {
                    this.content = [
                        {
                            type: 'paragraph',
                            content: AdfNode.parseText(block.text)
                        }
                    ];
                    break;
                }
                case 'codeBlock': {
                    this.content = [{ type: 'text', text: block.text }]; // No inner parsing
                    break;
                }
                case 'paragraph': {
                    this.content = AdfNode.parseText(block.text);
                    break;
                }
                default:
                    throw new Error(`Unsupported block type: ${block.type}`);
            }
        }
    }
    static parseText(text) {
        const nodes = [];
        const parser = new MarkdownTextParser_1.MarkdownTextParser(text);
        let block;
        while (block = parser.readBlock()) {
            //console.log(block);
            switch (block.type) {
                case 'code': {
                    nodes.push({
                        type: 'text',
                        text: block.text,
                        marks: [{ type: 'code' }]
                    });
                    break;
                }
                case 'link': {
                    nodes.push({
                        type: 'text',
                        text: block.text,
                        marks: [{ type: 'link', attrs: { href: block.href } }]
                    });
                    break;
                }
                case 'text': {
                    nodes.push({
                        type: 'text',
                        text: block.text
                    });
                    break;
                }
                default:
                    throw new Error(`Unsupported text block type: ${block.type}`);
            }
        }
        //console.log("EOI");
        return nodes;
    }
}
exports.AdfNode = AdfNode;
//# sourceMappingURL=AtlassianDocumentFormat.js.map