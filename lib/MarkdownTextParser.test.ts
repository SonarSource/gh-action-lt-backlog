import { expect } from 'expect';
import { MarkdownTextParser } from '../lib/MarkdownTextParser';

describe('MarkdownTextParser', () => {
  it('parses plain text', () => {
    const sut = new MarkdownTextParser('Lorem ipsum');
    expect(sut.readBlock()).toEqual({ type: 'text', text: 'Lorem ipsum' });
    expect(sut.readBlock()).toBeNull();
  });

  it('parses inline code', () => {
    const parser = new MarkdownTextParser('Before `snippet` after.');
    expect(parser.readBlock()).toEqual({ type: 'text', text: 'Before ' });
    expect(parser.readBlock()).toEqual({ type: 'code', text: 'snippet' });
    expect(parser.readBlock()).toEqual({ type: 'text', text: ' after.' });
    expect(parser.readBlock()).toBeNull();
  });

  it('parses inline code chain', () => {
    const parser = new MarkdownTextParser('`snippet1` `snippet2``snippet3 no space before`');
    expect(parser.readBlock()).toEqual({ type: 'code', text: 'snippet1' });
    expect(parser.readBlock()).toEqual({ type: 'text', text: ' ' });
    expect(parser.readBlock()).toEqual({ type: 'code', text: 'snippet2' });
    expect(parser.readBlock()).toEqual({ type: 'code', text: 'snippet3 no space before' });
    expect(parser.readBlock()).toBeNull();
  });

  it('parses a link', () => {
    const parser = new MarkdownTextParser('Before [title](http://example.com) after.');
    expect(parser.readBlock()).toEqual({ type: 'text', text: 'Before ' });
    expect(parser.readBlock()).toEqual({ type: 'link', text: 'title', href: 'http://example.com' });
    expect(parser.readBlock()).toEqual({ type: 'text', text: ' after.' });
    expect(parser.readBlock()).toBeNull();
  });

  it('parses a link chain', () => {
    const parser = new MarkdownTextParser('[title1](title1) [title2 with space](link2)[title3 no space before](link3)');
    expect(parser.readBlock()).toEqual({ type: 'link', text: 'title1', href: 'title1' });
    expect(parser.readBlock()).toEqual({ type: 'text', text: ' ' });
    expect(parser.readBlock()).toEqual({ type: 'link', text: 'title2 with space', href: 'link2' });
    expect(parser.readBlock()).toEqual({ type: 'link', text: 'title3 no space before', href: 'link3' });
    expect(parser.readBlock()).toBeNull();
  });

  it('parses http(s)://', () => {
    const parser = new MarkdownTextParser('Before http://http.no.comma, between https://https.no.semicolon; or http://with.single.questionmark?... But http://no.trailing.questionmark???? Or http://with.query.stirng?what=about&this? And https://with.hash#hash-asdf. https://with.all?key=value&flag#hash. And https:// too.');
    expect(parser.readBlock()).toEqual({ type: 'text', text: 'Before ' });
    expect(parser.readBlock()).toEqual({ type: 'link', text: 'http://http.no.comma', href: 'http://http.no.comma' });
    expect(parser.readBlock()).toEqual({ type: 'text', text: ', between ' });
    expect(parser.readBlock()).toEqual({ type: 'link', text: 'https://https.no.semicolon', href: 'https://https.no.semicolon' });
    expect(parser.readBlock()).toEqual({ type: 'text', text: '; or ' });
    expect(parser.readBlock()).toEqual({ type: 'link', text: 'http://with.single.questionmark', href: 'http://with.single.questionmark' });
    expect(parser.readBlock()).toEqual({ type: 'text', text: '?... But ' });
    expect(parser.readBlock()).toEqual({ type: 'link', text: 'http://no.trailing.questionmark', href: 'http://no.trailing.questionmark' });
    expect(parser.readBlock()).toEqual({ type: 'text', text: '???? Or ' });
    expect(parser.readBlock()).toEqual({ type: 'link', text: 'http://with.query.stirng?what=about&this', href: 'http://with.query.stirng?what=about&this' });
    expect(parser.readBlock()).toEqual({ type: 'text', text: '? And ' });
    expect(parser.readBlock()).toEqual({ type: 'link', text: 'https://with.hash#hash-asdf', href: 'https://with.hash#hash-asdf' });
    expect(parser.readBlock()).toEqual({ type: 'text', text: '. ' });
    expect(parser.readBlock()).toEqual({ type: 'link', text: 'https://with.all?key=value&flag#hash', href: 'https://with.all?key=value&flag#hash' });
    expect(parser.readBlock()).toEqual({ type: 'text', text: '. And ' });
    expect(parser.readBlock()).toEqual({ type: 'link', text: 'https://', href: 'https://' });
    expect(parser.readBlock()).toEqual({ type: 'text', text: ' too.' });
    expect(parser.readBlock()).toBeNull();
  });

  it('parses mixed content', () => {
    const parser = new MarkdownTextParser('Before `snippet1` [title1](url1) `snippet2` [title2](url2) https://example.com after.');
    expect(parser.readBlock()).toEqual({ type: 'text', text: 'Before ' });
    expect(parser.readBlock()).toEqual({ type: 'code', text: 'snippet1' });
    expect(parser.readBlock()).toEqual({ type: 'text', text: ' ' });
    expect(parser.readBlock()).toEqual({ type: 'link', text: 'title1', href: 'url1' });
    expect(parser.readBlock()).toEqual({ type: 'text', text: ' ' });
    expect(parser.readBlock()).toEqual({ type: 'code', text: 'snippet2' });
    expect(parser.readBlock()).toEqual({ type: 'text', text: ' ' });
    expect(parser.readBlock()).toEqual({ type: 'link', text: 'title2', href: 'url2' });
    expect(parser.readBlock()).toEqual({ type: 'text', text: ' ' });
    expect(parser.readBlock()).toEqual({ type: 'link', text: 'https://example.com', href: 'https://example.com' });
    expect(parser.readBlock()).toEqual({ type: 'text', text: ' after.' });
    expect(parser.readBlock()).toBeNull();
  });

  it('handles unterminated code', () => {
    const parser = new MarkdownTextParser('`unterminated');
    expect(parser.readBlock()).toEqual({ type: 'code', text: 'unterminated' });
    expect(parser.readBlock()).toBeNull();
  });

  it('handles text with brackets not a link', () => {
    const parser = new MarkdownTextParser('Not a [link');
    expect(parser.readBlock()).toEqual({ type: 'text', text: 'Not a [link' });
    expect(parser.readBlock()).toBeNull();
  });

  it('handles text starting with brackets that are not a link', () => {
    const parser = new MarkdownTextParser('[S1234] is not a link `has also snippet`');
    expect(parser.readBlock()).toEqual({ type: 'text', text: '[S1234] is not a link ' });
    expect(parser.readBlock()).toEqual({ type: 'code', text: 'has also snippet' });
    expect(parser.readBlock()).toBeNull();
  });

  it('handles empty string', () => {
    const parser = new MarkdownTextParser('');
    expect(parser.readBlock()).toBeNull();
  });
});
