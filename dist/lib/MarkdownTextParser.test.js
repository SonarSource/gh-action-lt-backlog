"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const expect_1 = require("expect");
test("Title", () => {
    (0, expect_1.expect)(42).toBe(42);
});
test("To fail", () => {
    (0, expect_1.expect)(42).toBe(43);
});
//test('MarkdownTextParser', () => {
//  it('parses plain text', () => {
//    const sut = new MarkdownTextParser('Lorem ipsum');
//    expect(sut.readBlock()).toEqual({ type: 'text', text: 'Lorem ipsum' });
//    expect(sut.readBlock()).toBeNull();
//  });
//  it('parses inline code', () => {
//    const parser = new MarkdownTextParser('Before `snippet` after.');
//    expect(parser.readBlock()).toEqual({ type: 'text', text: 'Before ' });
//    expect(parser.readBlock()).toEqual({ type: 'code', text: 'snippet' });
//    expect(parser.readBlock()).toEqual({ type: 'text', text: ' after.' });
//    expect(parser.readBlock()).toBeNull();
//  });
//  it('parses inline code chain', () => {
//    const parser = new MarkdownTextParser('`snippet1` `snippet2``snippet3 no space before`');
//    expect(parser.readBlock()).toEqual({ type: 'code', text: 'snippet1' });
//    expect(parser.readBlock()).toEqual({ type: 'text', text: ' ' });
//    expect(parser.readBlock()).toEqual({ type: 'code', text: 'snippet2' });
//    expect(parser.readBlock()).toEqual({ type: 'code', text: 'snippet3 no space before' });
//    expect(parser.readBlock()).toBeNull();
//  });
//  it('parses a link', () => {
//    const parser = new MarkdownTextParser('Before [title](http://example.com) after.');
//    expect(parser.readBlock()).toEqual({ type: 'text', text: 'Before ' });
//    expect(parser.readBlock()).toEqual({ type: 'link', text: 'title', href: 'http://example.com' });
//    expect(parser.readBlock()).toEqual({ type: 'text', text: ' after.' });
//    expect(parser.readBlock()).toBeNull();
//  });
//  it('parses a link chain', () => {
//    const parser = new MarkdownTextParser('[title1](title1) [title2 with space](link2)[title3 no space before](link3)');
//    expect(parser.readBlock()).toEqual({ type: 'link', text: 'title1', href: 'title1' });
//    expect(parser.readBlock()).toEqual({ type: 'text', text: ' ' });
//    expect(parser.readBlock()).toEqual({ type: 'link', text: 'title2 with space', href: 'link2' });
//    expect(parser.readBlock()).toEqual({ type: 'link', text: 'title3 no space before', href: 'link3' });
//    expect(parser.readBlock()).toBeNull();
//  });
//  it('parses mixed content', () => {
//    const parser = new MarkdownTextParser('Before `snippet1` [title1](url1) `snippet2` [title2](url2) after.');
//    expect(parser.readBlock()).toEqual({ type: 'text', text: 'Before ' });
//    expect(parser.readBlock()).toEqual({ type: 'code', text: 'snippet1' });
//    expect(parser.readBlock()).toEqual({ type: 'text', text: ' ' });
//    expect(parser.readBlock()).toEqual({ type: 'link', text: 'title1', href: 'url1' });
//    expect(parser.readBlock()).toEqual({ type: 'text', text: ' ' });
//    expect(parser.readBlock()).toEqual({ type: 'code', text: 'snippet2' });
//    expect(parser.readBlock()).toEqual({ type: 'text', text: ' ' });
//    expect(parser.readBlock()).toEqual({ type: 'link', text: 'title2', href: 'url2' });
//    expect(parser.readBlock()).toEqual({ type: 'text', text: ' after.' });
//    expect(parser.readBlock()).toBeNull();
//  });
//  it('handles unterminated code', () => {
//    const parser = new MarkdownTextParser('`unterminated');
//    expect(parser.readBlock()).toEqual({ type: 'code', text: 'unterminated' });
//    expect(parser.readBlock()).toBeNull();
//  });
//  it('handles text with brackets not a link', () => {
//    const parser = new MarkdownTextParser('Not a [link');
//    expect(parser.readBlock()).toEqual({ type: 'text', text: 'Not a [link' });
//    expect(parser.readBlock()).toBeNull();
//  });
//  //it('handles empty string', () => {
//  //  const parser = new MarkdownTextParser('');
//  //  expect(parser.readBlock()).toBeNull();
//  //});
//});
//# sourceMappingURL=MarkdownTextParser.test.js.map