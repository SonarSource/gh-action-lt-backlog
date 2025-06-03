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
            return { type: 'code', text: this.readCode() };
        }
        else {
            const match = this.matchLink(this.nextIndex);
            if (match == null) {
                return { type: 'text', text: this.readText() };
            }
            else {
                this.nextIndex += match[0].length;
                return { type: 'link', text: match.groups.title, href: match.groups.href };
            }
        }
    }
    readText() {
        const end = this.nextTokenIndex();
        const result = this.text.substring(this.nextIndex, end);
        this.nextIndex = end;
        return result;
    }
    nextTokenIndex() {
        let index = this.nextIndex;
        let next = new NextIndex(this.text, index);
        while (next.code > 0 || next.link > 0) {
            //console.log(next);
            if (next.code > 0 && (next.link < 0 || next.code < next.link)) {
                return next.code;
            }
            else if (next.link > 0) {
                if (this.matchLink(next.link) != null) {
                    return next.link;
                }
                else {
                    index = next.link + 1;
                    next = new NextIndex(this.text, index);
                }
            }
        }
        return this.text.length;
    }
    readCode() {
        let end = this.text.indexOf('`', this.nextIndex + 1);
        if (end < 0) {
            end = this.text.length;
        }
        const result = this.text.substring(this.nextIndex + 1, end);
        this.nextIndex = end + 1;
        return result;
    }
    matchLink(index) {
        return this.text[index] === '['
            ? this.text.substring(index).match(/^\[(?<title>[^\]]+)\]\((?<href>[^) ]+)\)/)
            : null;
    }
}
exports.MarkdownTextParser = MarkdownTextParser;
class NextIndex {
    code;
    link;
    constructor(text, index) {
        this.code = text.indexOf('`', index);
        this.link = text.indexOf('[', index);
        if (this.code === index || this.link === index) {
            throw new Error('This should be called only when current token starts with text.');
        }
    }
}
//# sourceMappingURL=MarkdownTextParser.js.map