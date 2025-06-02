"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MarkdownTextParser = void 0;
class MarkdownTextParser {
    text;
    nextIndex = 0;
    constructor(text) {
        this.text = text;
    }
    readBlock() {
        console.log(`readBlock ${this.nextIndex}: ${this.text.substring(this.nextIndex, this.nextIndex + 20)}`);
        if (this.nextIndex >= this.text.length) {
            return null;
        }
        else if (this.text[this.nextIndex] === '`') {
            this.nextIndex++;
            const text = this.readUntil('`');
            this.nextIndex++;
            return { type: 'code', text };
        }
        else {
            return { type: 'text', text: this.readUntil('`') }; // FIXME: Or any other well-known token
        }
    }
    readUntil(delimiter) {
        let end = this.text.indexOf(delimiter, this.nextIndex);
        if (end < 0) {
            end = this.text.length;
        }
        const result = this.text.substring(this.nextIndex, end);
        this.nextIndex = end;
        return result;
    }
}
exports.MarkdownTextParser = MarkdownTextParser;
//# sourceMappingURL=MarkdownTextParser.js.map