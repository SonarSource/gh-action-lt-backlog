import { assertEqual } from './support/Assertions.js';
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { MarkdownTextParser } from '../src/helpers/MarkdownTextParser.js';
describe('MarkdownTextParser', () => {
  it('parses plain text', () => {
    const sut = new MarkdownTextParser('Lorem ipsum');
    assertEqual(sut.readBlock(), { type: 'text', text: 'Lorem ipsum' });
    assert.strictEqual(sut.readBlock(), null);
  });
  it('parses inline code', () => {
    const parser = new MarkdownTextParser('Before `snippet` after.');
    assertEqual(parser.readBlock(), { type: 'text', text: 'Before ' });
    assertEqual(parser.readBlock(), { type: 'code', text: 'snippet' });
    assertEqual(parser.readBlock(), { type: 'text', text: ' after.' });
    assert.strictEqual(parser.readBlock(), null);
  });
  it('parses inline code chain', () => {
    const parser = new MarkdownTextParser('`snippet1` `snippet2``snippet3 no space before`');
    assertEqual(parser.readBlock(), { type: 'code', text: 'snippet1' });
    assertEqual(parser.readBlock(), { type: 'text', text: ' ' });
    assertEqual(parser.readBlock(), { type: 'code', text: 'snippet2' });
    assertEqual(parser.readBlock(), { type: 'code', text: 'snippet3 no space before' });
    assert.strictEqual(parser.readBlock(), null);
  });
  it('parses a link', () => {
    const parser = new MarkdownTextParser('Before [title](https://example.com) after.');
    assertEqual(parser.readBlock(), { type: 'text', text: 'Before ' });
    assertEqual(parser.readBlock(), {
      type: 'link',
      text: 'title',
      href: 'https://example.com',
    });
    assertEqual(parser.readBlock(), { type: 'text', text: ' after.' });
    assert.strictEqual(parser.readBlock(), null);
  });
  it('parses a link chain', () => {
    const parser = new MarkdownTextParser(
      '[title1](title1) [title2 with space](link2)[title3 no space before](link3)',
    );
    assertEqual(parser.readBlock(), { type: 'link', text: 'title1', href: 'title1' });
    assertEqual(parser.readBlock(), { type: 'text', text: ' ' });
    assertEqual(parser.readBlock(), {
      type: 'link',
      text: 'title2 with space',
      href: 'link2',
    });
    assertEqual(parser.readBlock(), {
      type: 'link',
      text: 'title3 no space before',
      href: 'link3',
    });
    assert.strictEqual(parser.readBlock(), null);
  });
  it('parses http(s)://', () => {
    const parser = new MarkdownTextParser(
      'Before https://http.no.comma, between https://https.no.semicolon; or https://with.single.questionmark?... But https://no.trailing.questionmark???? Or https://with.query.stirng?what=about&this? And https://with.hash#hash-asdf. https://with.all?key=value&flag#hash. And https:// too.',
    );
    assertEqual(parser.readBlock(), { type: 'text', text: 'Before ' });
    assertEqual(parser.readBlock(), {
      type: 'link',
      text: 'https://http.no.comma',
      href: 'https://http.no.comma',
    });
    assertEqual(parser.readBlock(), { type: 'text', text: ', between ' });
    assertEqual(parser.readBlock(), {
      type: 'link',
      text: 'https://https.no.semicolon',
      href: 'https://https.no.semicolon',
    });
    assertEqual(parser.readBlock(), { type: 'text', text: '; or ' });
    assertEqual(parser.readBlock(), {
      type: 'link',
      text: 'https://with.single.questionmark',
      href: 'https://with.single.questionmark',
    });
    assertEqual(parser.readBlock(), { type: 'text', text: '?... But ' });
    assertEqual(parser.readBlock(), {
      type: 'link',
      text: 'https://no.trailing.questionmark',
      href: 'https://no.trailing.questionmark',
    });
    assertEqual(parser.readBlock(), { type: 'text', text: '???? Or ' });
    assertEqual(parser.readBlock(), {
      type: 'link',
      text: 'https://with.query.stirng?what=about&this',
      href: 'https://with.query.stirng?what=about&this',
    });
    assertEqual(parser.readBlock(), { type: 'text', text: '? And ' });
    assertEqual(parser.readBlock(), {
      type: 'link',
      text: 'https://with.hash#hash-asdf',
      href: 'https://with.hash#hash-asdf',
    });
    assertEqual(parser.readBlock(), { type: 'text', text: '. ' });
    assertEqual(parser.readBlock(), {
      type: 'link',
      text: 'https://with.all?key=value&flag#hash',
      href: 'https://with.all?key=value&flag#hash',
    });
    assertEqual(parser.readBlock(), { type: 'text', text: '. And ' });
    assertEqual(parser.readBlock(), { type: 'link', text: 'https://', href: 'https://' });
    assertEqual(parser.readBlock(), { type: 'text', text: ' too.' });
    assert.strictEqual(parser.readBlock(), null);
  });
  it('parses mixed content', () => {
    const parser = new MarkdownTextParser(
      'Before `snippet1` [title1](url1) `snippet2` [title2](url2) https://example.com after.',
    );
    assertEqual(parser.readBlock(), { type: 'text', text: 'Before ' });
    assertEqual(parser.readBlock(), { type: 'code', text: 'snippet1' });
    assertEqual(parser.readBlock(), { type: 'text', text: ' ' });
    assertEqual(parser.readBlock(), { type: 'link', text: 'title1', href: 'url1' });
    assertEqual(parser.readBlock(), { type: 'text', text: ' ' });
    assertEqual(parser.readBlock(), { type: 'code', text: 'snippet2' });
    assertEqual(parser.readBlock(), { type: 'text', text: ' ' });
    assertEqual(parser.readBlock(), { type: 'link', text: 'title2', href: 'url2' });
    assertEqual(parser.readBlock(), { type: 'text', text: ' ' });
    assertEqual(parser.readBlock(), {
      type: 'link',
      text: 'https://example.com',
      href: 'https://example.com',
    });
    assertEqual(parser.readBlock(), { type: 'text', text: ' after.' });
    assert.strictEqual(parser.readBlock(), null);
  });
  it('handles unterminated code', () => {
    const parser = new MarkdownTextParser('`unterminated');
    assertEqual(parser.readBlock(), { type: 'code', text: 'unterminated' });
    assert.strictEqual(parser.readBlock(), null);
  });
  it('handles text with brackets not a link', () => {
    const parser = new MarkdownTextParser('Not a [link');
    assertEqual(parser.readBlock(), { type: 'text', text: 'Not a [link' });
    assert.strictEqual(parser.readBlock(), null);
  });
  it('handles text starting with brackets that are not a link', () => {
    const parser = new MarkdownTextParser('[S1234] is not a link `has also snippet`');
    assertEqual(parser.readBlock(), { type: 'text', text: '[S1234] is not a link ' });
    assertEqual(parser.readBlock(), { type: 'code', text: 'has also snippet' });
    assert.strictEqual(parser.readBlock(), null);
  });
  it('handles empty string', () => {
    const parser = new MarkdownTextParser('');
    assert.strictEqual(parser.readBlock(), null);
  });
});
