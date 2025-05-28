"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MarkdownParser = void 0;
class MarkdownParser {
    lines;
    nextIndex = 0;
    constructor(markdown) {
        this.lines = markdown.split('\n').map(line => line.trimEnd());
    }
    readBlock() {
        if (this.nextIndex >= this.lines.length) {
            return null;
        }
        const line = this.lines[this.nextIndex++];
        if (this.isHeading(line)) {
            return { type: 'heading', text: line };
        }
        else {
            return { type: 'paragraph', text: line };
        }
    }
    isParagraph(line) {
        return !this.isHeading(line);
    }
    isHeading(line) {
        return /^#{1,6} /.test(line);
    }
}
exports.MarkdownParser = MarkdownParser;
//# sourceMappingURL=MarkdownParser.js.map