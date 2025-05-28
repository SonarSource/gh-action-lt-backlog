"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdfNode = exports.AtlassianDocument = void 0;
const MarkdownParser_1 = require("./MarkdownParser");
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
        // FIXME: Titles
        // #
        // ##
        // ###
        // FIXME: Quoted text
        // FIXME: Code blocks
        // FIXME: Inline links
        // FIXME: Inline code span (how is it called?)
        // FIXME: Inline text, no formatting
        while (block = parser.readBlock()) {
            contents.push(new AdfNode(block));
        }
        return new AtlassianDocument(contents);
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
        switch (block?.type) {
            case 'heading': {
                const level = block.text.indexOf(' ');
                this.type = block.type;
                this.attrs = { level };
                this.content = [
                    {
                        type: 'text',
                        text: block.text.substring(level + 1)
                    }
                ];
                break;
            }
            case 'paragraph': {
                this.type = block.type;
                this.content = [
                    {
                        type: 'text',
                        text: block.text
                    }
                ];
            }
        }
    }
}
exports.AdfNode = AdfNode;
//# sourceMappingURL=AtlassianDocumentFormat.js.map