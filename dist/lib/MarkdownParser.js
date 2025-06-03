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
        if (!this.canRead()) {
            return null;
        }
        let line = this.readLine();
        while (line.trim() === '' && this.canRead()) {
            line = this.readLine();
        }
        if (this.isHeading(line)) {
            return { type: 'heading', text: line };
        }
        else if (this.isCodeBlock(line)) {
            return { type: 'codeBlock', text: this.readCodeBlock() };
        }
        else if (this.isBlockQuote(line)) {
            return { type: 'blockquote', text: this.readBlockquote(line) };
        }
        else {
            return { type: 'paragraph', text: this.readParagraph(line) };
        }
    }
    canRead() {
        return this.nextIndex < this.lines.length;
    }
    readLine() {
        return this.lines[this.nextIndex++];
    }
    readCodeBlock() {
        let text = "";
        while (this.nextIndex < this.lines.length && !this.isCodeBlock(this.lines[this.nextIndex])) {
            text += (text ? '\n' : '') + this.readLine();
        }
        this.nextIndex++; // Skip the closing code block line
        return text;
    }
    readBlockquote(line) {
        let text = line.substring(1).trimStart();
        while (this.nextIndex < this.lines.length && this.isBlockQuote(this.lines[this.nextIndex])) {
            text += '\n' + this.readLine().substring(1).trimStart();
        }
        return text;
    }
    readParagraph(line) {
        let text = line;
        while (this.nextIndex < this.lines.length && this.isParagraph(this.lines[this.nextIndex])) {
            text += '\n' + this.readLine();
        }
        return text;
    }
    isParagraph(line) {
        return !this.isHeading(line) && !this.isCodeBlock(line) && !this.isBlockQuote(line);
    }
    isHeading(line) {
        return /^#{1,6} /.test(line);
    }
    isCodeBlock(line) {
        return /^```\w*#?$/.test(line); // 4 backticks ```` are not supported and it won't work correctly as they are used to escape ``` in snippets
    }
    isBlockQuote(line) {
        return line.startsWith('>');
    }
}
exports.MarkdownParser = MarkdownParser;
//# sourceMappingURL=MarkdownParser.js.map