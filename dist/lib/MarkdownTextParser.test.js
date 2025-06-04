"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const expect_1 = require("expect");
const MarkdownTextParser_1 = require("../lib/MarkdownTextParser");
describe('MarkdownTextParser', () => {
    test('parses plain text', () => {
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
        const parser = new MarkdownTextParser_1.MarkdownTextParser('Before [title](http://example.com) after.');
        (0, expect_1.expect)(parser.readBlock()).toEqual({ type: 'text', text: 'Before ' });
        (0, expect_1.expect)(parser.readBlock()).toEqual({ type: 'link', text: 'title', href: 'http://example.com' });
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
    it('parses mixed content', () => {
        const parser = new MarkdownTextParser_1.MarkdownTextParser('Before `snippet1` [title1](url1) `snippet2` [title2](url2) after.');
        (0, expect_1.expect)(parser.readBlock()).toEqual({ type: 'text', text: 'Before ' });
        (0, expect_1.expect)(parser.readBlock()).toEqual({ type: 'code', text: 'snippet1' });
        (0, expect_1.expect)(parser.readBlock()).toEqual({ type: 'text', text: ' ' });
        (0, expect_1.expect)(parser.readBlock()).toEqual({ type: 'link', text: 'title1', href: 'url1' });
        (0, expect_1.expect)(parser.readBlock()).toEqual({ type: 'text', text: ' ' });
        (0, expect_1.expect)(parser.readBlock()).toEqual({ type: 'code', text: 'snippet2' });
        (0, expect_1.expect)(parser.readBlock()).toEqual({ type: 'text', text: ' ' });
        (0, expect_1.expect)(parser.readBlock()).toEqual({ type: 'link', text: 'title2', href: 'url2' });
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
    it('handles empty string', () => {
        const parser = new MarkdownTextParser_1.MarkdownTextParser('');
        (0, expect_1.expect)(parser.readBlock()).toBeNull();
    });
});
//# sourceMappingURL=MarkdownTextParser.test.js.map