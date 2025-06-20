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
        if (this.nextIndex >= this.text.length) {
            return null;
        }
        else if (this.text[this.nextIndex] === '`') {
            return { type: 'code', text: this.readCode() };
        }
        else if (this.text.startsWith('http://', this.nextIndex) || this.text.startsWith('https://', this.nextIndex)) {
            const href = this.readHref();
            return { type: 'link', text: href, href };
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
        while (next.token > 0 || next.link > 0) {
            if (next.token > 0 && (next.link < 0 || next.token < next.link)) {
                return next.token;
            }
            else if (next.link >= 0) {
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
    readHref() {
        const match = this.text.substring(this.nextIndex).match(/^https?:\/\/[^\s,;)]*/);
        let text = match[0];
        while (text.endsWith('?') || text.endsWith('.')) {
            text = text.substring(0, text.length - 1);
        }
        this.nextIndex += text.length;
        return text;
    }
}
exports.MarkdownTextParser = MarkdownTextParser;
class NextIndex {
    token = -1;
    link;
    constructor(text, index) {
        this.token = this.minToken(text.indexOf('`', index));
        this.token = this.minToken(text.indexOf('http://', index));
        this.token = this.minToken(text.indexOf('https://', index));
        this.link = text.indexOf('[', index); // Might, or might not be a link
        if (this.token === index) {
            throw new Error('This should be called only when current token starts with text.');
        }
    }
    minToken(candidate) {
        return this.token < 0 || (candidate >= 0 && candidate < this.token)
            ? candidate
            : this.token;
    }
}
//# sourceMappingURL=MarkdownTextParser.js.map