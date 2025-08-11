"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const expect_1 = require("expect");
const MarkdownTextParser_1 = require("../lib/MarkdownTextParser");
describe('MarkdownTextParser', () => {
    it('parses plain text', () => {
        const sut = new MarkdownTextParser_1.MarkdownTextParser('Lorem ipsum');
        (0, expect_1.expect)(sut.readBlock()).toEqual({ type: 'text', text: 'Lorem ipsum' });
        (0, expect_1.expect)(sut.readBlock()).toBeNull();
    });
    it('parses inline code', () => {
        const parser = new MarkdownTextParser_1.MarkdownTextParser('Before `snippet` after.');
        (0, expect_1.expect)(parser.readBlock()).toEqual({ type: 'text', text: 'Before ' });
        (0, expect_1.expect)(parser.readBlock()).toEqual({ type: 'code', text: 'snippet' });
        (0, expect_1.expect)(parser.readBlock()).toEqual({ type: 'text', text: ' after.' });
        (0, expect_1.expect)(parser.readBlock()).toBeNull();
    });
    it('parses inline code chain', () => {
        const parser = new MarkdownTextParser_1.MarkdownTextParser('`snippet1` `snippet2``snippet3 no space before`');
        (0, expect_1.expect)(parser.readBlock()).toEqual({ type: 'code', text: 'snippet1' });
        (0, expect_1.expect)(parser.readBlock()).toEqual({ type: 'text', text: ' ' });
        (0, expect_1.expect)(parser.readBlock()).toEqual({ type: 'code', text: 'snippet2' });
        (0, expect_1.expect)(parser.readBlock()).toEqual({ type: 'code', text: 'snippet3 no space before' });
        (0, expect_1.expect)(parser.readBlock()).toBeNull();
    });
    it('parses a link', () => {
        const parser = new MarkdownTextParser_1.MarkdownTextParser('Before [title](https://example.com) after.');
        (0, expect_1.expect)(parser.readBlock()).toEqual({ type: 'text', text: 'Before ' });
        (0, expect_1.expect)(parser.readBlock()).toEqual({ type: 'link', text: 'title', href: 'https://example.com' });
        (0, expect_1.expect)(parser.readBlock()).toEqual({ type: 'text', text: ' after.' });
        (0, expect_1.expect)(parser.readBlock()).toBeNull();
    });
    it('parses a link chain', () => {
        const parser = new MarkdownTextParser_1.MarkdownTextParser('[title1](title1) [title2 with space](link2)[title3 no space before](link3)');
        (0, expect_1.expect)(parser.readBlock()).toEqual({ type: 'link', text: 'title1', href: 'title1' });
        (0, expect_1.expect)(parser.readBlock()).toEqual({ type: 'text', text: ' ' });
        (0, expect_1.expect)(parser.readBlock()).toEqual({ type: 'link', text: 'title2 with space', href: 'link2' });
        (0, expect_1.expect)(parser.readBlock()).toEqual({ type: 'link', text: 'title3 no space before', href: 'link3' });
        (0, expect_1.expect)(parser.readBlock()).toBeNull();
    });
    it('parses http(s)://', () => {
        const parser = new MarkdownTextParser_1.MarkdownTextParser('Before https://http.no.comma, between https://https.no.semicolon; or https://with.single.questionmark?... But https://no.trailing.questionmark???? Or https://with.query.stirng?what=about&this? And https://with.hash#hash-asdf. https://with.all?key=value&flag#hash. And https:// too.');
        (0, expect_1.expect)(parser.readBlock()).toEqual({ type: 'text', text: 'Before ' });
        (0, expect_1.expect)(parser.readBlock()).toEqual({ type: 'link', text: 'https://http.no.comma', href: 'https://http.no.comma' });
        (0, expect_1.expect)(parser.readBlock()).toEqual({ type: 'text', text: ', between ' });
        (0, expect_1.expect)(parser.readBlock()).toEqual({ type: 'link', text: 'https://https.no.semicolon', href: 'https://https.no.semicolon' });
        (0, expect_1.expect)(parser.readBlock()).toEqual({ type: 'text', text: '; or ' });
        (0, expect_1.expect)(parser.readBlock()).toEqual({ type: 'link', text: 'https://with.single.questionmark', href: 'https://with.single.questionmark' });
        (0, expect_1.expect)(parser.readBlock()).toEqual({ type: 'text', text: '?... But ' });
        (0, expect_1.expect)(parser.readBlock()).toEqual({ type: 'link', text: 'https://no.trailing.questionmark', href: 'https://no.trailing.questionmark' });
        (0, expect_1.expect)(parser.readBlock()).toEqual({ type: 'text', text: '???? Or ' });
        (0, expect_1.expect)(parser.readBlock()).toEqual({ type: 'link', text: 'https://with.query.stirng?what=about&this', href: 'https://with.query.stirng?what=about&this' });
        (0, expect_1.expect)(parser.readBlock()).toEqual({ type: 'text', text: '? And ' });
        (0, expect_1.expect)(parser.readBlock()).toEqual({ type: 'link', text: 'https://with.hash#hash-asdf', href: 'https://with.hash#hash-asdf' });
        (0, expect_1.expect)(parser.readBlock()).toEqual({ type: 'text', text: '. ' });
        (0, expect_1.expect)(parser.readBlock()).toEqual({ type: 'link', text: 'https://with.all?key=value&flag#hash', href: 'https://with.all?key=value&flag#hash' });
        (0, expect_1.expect)(parser.readBlock()).toEqual({ type: 'text', text: '. And ' });
        (0, expect_1.expect)(parser.readBlock()).toEqual({ type: 'link', text: 'https://', href: 'https://' });
        (0, expect_1.expect)(parser.readBlock()).toEqual({ type: 'text', text: ' too.' });
        (0, expect_1.expect)(parser.readBlock()).toBeNull();
    });
    it('parses mixed content', () => {
        const parser = new MarkdownTextParser_1.MarkdownTextParser('Before `snippet1` [title1](url1) `snippet2` [title2](url2) https://example.com after.');
        (0, expect_1.expect)(parser.readBlock()).toEqual({ type: 'text', text: 'Before ' });
        (0, expect_1.expect)(parser.readBlock()).toEqual({ type: 'code', text: 'snippet1' });
        (0, expect_1.expect)(parser.readBlock()).toEqual({ type: 'text', text: ' ' });
        (0, expect_1.expect)(parser.readBlock()).toEqual({ type: 'link', text: 'title1', href: 'url1' });
        (0, expect_1.expect)(parser.readBlock()).toEqual({ type: 'text', text: ' ' });
        (0, expect_1.expect)(parser.readBlock()).toEqual({ type: 'code', text: 'snippet2' });
        (0, expect_1.expect)(parser.readBlock()).toEqual({ type: 'text', text: ' ' });
        (0, expect_1.expect)(parser.readBlock()).toEqual({ type: 'link', text: 'title2', href: 'url2' });
        (0, expect_1.expect)(parser.readBlock()).toEqual({ type: 'text', text: ' ' });
        (0, expect_1.expect)(parser.readBlock()).toEqual({ type: 'link', text: 'https://example.com', href: 'https://example.com' });
        (0, expect_1.expect)(parser.readBlock()).toEqual({ type: 'text', text: ' after.' });
        (0, expect_1.expect)(parser.readBlock()).toBeNull();
    });
    it('handles unterminated code', () => {
        const parser = new MarkdownTextParser_1.MarkdownTextParser('`unterminated');
        (0, expect_1.expect)(parser.readBlock()).toEqual({ type: 'code', text: 'unterminated' });
        (0, expect_1.expect)(parser.readBlock()).toBeNull();
    });
    it('handles text with brackets not a link', () => {
        const parser = new MarkdownTextParser_1.MarkdownTextParser('Not a [link');
        (0, expect_1.expect)(parser.readBlock()).toEqual({ type: 'text', text: 'Not a [link' });
        (0, expect_1.expect)(parser.readBlock()).toBeNull();
    });
    it('handles text starting with brackets that are not a link', () => {
        const parser = new MarkdownTextParser_1.MarkdownTextParser('[S1234] is not a link `has also snippet`');
        (0, expect_1.expect)(parser.readBlock()).toEqual({ type: 'text', text: '[S1234] is not a link ' });
        (0, expect_1.expect)(parser.readBlock()).toEqual({ type: 'code', text: 'has also snippet' });
        (0, expect_1.expect)(parser.readBlock()).toBeNull();
    });
    it('handles empty string', () => {
        const parser = new MarkdownTextParser_1.MarkdownTextParser('');
        (0, expect_1.expect)(parser.readBlock()).toBeNull();
    });
});
//# sourceMappingURL=MarkdownTextParser.test.js.map