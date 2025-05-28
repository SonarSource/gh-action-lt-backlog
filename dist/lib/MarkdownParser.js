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
        else if (this.isCodeBlock(line)) {
            let text = "";
            while (this.nextIndex < this.lines.length && !this.isCodeBlock(this.lines[this.nextIndex])) {
                text += (text ? '\n' : '') + this.lines[this.nextIndex++];
            }
            this.nextIndex++; // Skip the closing code block line
            return { type: 'codeBlock', text };
        }
        else {
            let text = line;
            while (this.nextIndex < this.lines.length && this.isParagraph(this.lines[this.nextIndex])) {
                text += '\n' + this.lines[this.nextIndex++];
            }
            return { type: 'paragraph', text };
        }
    }
    isParagraph(line) {
        return !this.isHeading(line) && !this.isCodeBlock(line);
    }
    isHeading(line) {
        return /^#{1,6} /.test(line);
    }
    isCodeBlock(line) {
        return /^```\w*$/.test(line);
    }
}
exports.MarkdownParser = MarkdownParser;
//# sourceMappingURL=MarkdownParser.js.map