import { describe, it } from 'node:test';
import { MarkdownTextParser, TextBlock } from '../lib/MarkdownTextParser';
import { expect } from 'expect';

describe('MarkdownTextParser', () => {
  it('parses plain text', () => {
    const sut = new MarkdownTextParser('Lorem ipsum');
    expect(sut.readBlock()).toEqual({ type: 'text', text: 'Lorem ipsum' });
    expect(sut.readBlock()).toBeNull();
  });

  it('should fail', () => {
    expect(42).toBeNull();
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
