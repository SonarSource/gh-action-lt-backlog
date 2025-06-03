"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const MarkdownTextParser_1 = require("../lib/MarkdownTextParser");
const expect_1 = require("expect");
(0, node_test_1.describe)('MarkdownTextParser', () => {
    (0, node_test_1.it)('parses plain text', () => {
        const sut = new MarkdownTextParser_1.MarkdownTextParser('Lorem ipsum');
        (0, expect_1.expect)(sut.readBlock()).toEqual({ type: 'text', text: 'Lorem ipsum' });
        (0, expect_1.expect)(sut.readBlock()).toBeNull();
    });
    (0, node_test_1.it)('should fail', () => {
        (0, expect_1.expect)(42).toBeNull();
    });
    //it('parses inline code', () => {
    //  const parser = new MarkdownTextParser('`code`');
    //  const block = parser.readBlock();
    //  expect(block).toEqual({ type: 'code', text: 'code' });
    //  expect(parser.readBlock()).toBeNull();
    //});
    //it('parses a link', () => {
    //  const parser = new MarkdownTextParser('[title](http://example.com)');
    //  const block = parser.readBlock();
    //  expect(block).toEqual({ type: 'link', text: 'title', href: 'http://example.com' });
    //  expect(parser.readBlock()).toBeNull();
    //});
    //it('parses mixed content', () => {
    //  const parser = new MarkdownTextParser('Text `code` [link](url)');
    //  expect(parser.readBlock()).toEqual({ type: 'text', text: 'Text ' });
    //  expect(parser.readBlock()).toEqual({ type: 'code', text: 'code' });
    //  expect(parser.readBlock()).toEqual({ type: 'text', text: ' ' });
    //  expect(parser.readBlock()).toEqual({ type: 'link', text: 'link', href: 'url' });
    //  expect(parser.readBlock()).toBeNull();
    //});
    //it('handles unterminated code', () => {
    //  const parser = new MarkdownTextParser('`unterminated');
    //  expect(parser.readBlock()).toEqual({ type: 'code', text: 'unterminated' });
    //  expect(parser.readBlock()).toBeNull();
    //});
    //it('handles text with brackets not a link', () => {
    //  const parser = new MarkdownTextParser('Not a [link');
    //  expect(parser.readBlock()).toEqual({ type: 'text', text: 'Not a [link' });
    //  expect(parser.readBlock()).toBeNull();
    //});
    //it('handles empty string', () => {
    //  const parser = new MarkdownTextParser('');
    //  expect(parser.readBlock()).toBeNull();
    //});
});
//# sourceMappingURL=MarkdownTextParser.test.js.map