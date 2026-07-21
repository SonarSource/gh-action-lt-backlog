import { assertEqual } from './support/Assertions.js';
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { AtlassianDocument, AdfNode } from '../src/helpers/AtlassianDocumentFormat.js';
describe('AtlassianDocument', () => {
  describe('fromMarkdown', () => {
    it('parses all blocks', () => {
      const doc = AtlassianDocument.fromMarkdown(`
# Heading 1

Text 1

# Heading 2

Text 2
`);
      assertEqual(doc, {
        type: 'doc',
        version: 1,
        content: [
          { type: 'heading', content: [{ type: 'text', text: 'Heading 1' }], attrs: { level: 1 } },
          { type: 'paragraph', content: [{ type: 'text', text: 'Text 1\n' }] },
          { type: 'heading', content: [{ type: 'text', text: 'Heading 2' }], attrs: { level: 1 } },
          { type: 'paragraph', content: [{ type: 'text', text: 'Text 2\n' }] },
        ],
      });
    });
    it('parses mixed content', () => {
      const doc = AtlassianDocument.fromMarkdown(`
# Heading 1

Intro \`snippet\` and [link](#url).

## Heading 2

\`\`\`
[This is not a](link)
And this is not a \`snippet\`.
This is a reproducer code block.
\`\`\`

Code comment

# Heading \`1\` or [3](#3)?

> I \`told\` you
> so [here](#citation).
`);
      assertEqual(doc, {
        type: 'doc',
        version: 1,
        content: [
          {
            type: 'heading',
            attrs: { level: 1 },
            content: [{ type: 'text', text: 'Heading 1' }],
          },
          {
            type: 'paragraph',
            content: [
              { type: 'text', text: 'Intro ' },
              { type: 'text', text: 'snippet', marks: [{ type: 'code' }] },
              { type: 'text', text: ' and ' },
              { type: 'text', text: 'link', marks: [{ attrs: { href: '#url' }, type: 'link' }] },
              { type: 'text', text: '.\n' },
            ],
          },
          {
            type: 'heading',
            attrs: { level: 2 },
            content: [{ text: 'Heading 2', type: 'text' }],
          },
          {
            type: 'codeBlock',
            content: [
              {
                type: 'text',
                text: '[This is not a](link)\nAnd this is not a `snippet`.\nThis is a reproducer code block.',
              },
            ],
          },
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'Code comment\n' }],
          },
          {
            type: 'heading',
            attrs: { level: 1 },
            content: [
              { type: 'text', text: 'Heading ' },
              { type: 'text', text: '1', marks: [{ type: 'code' }] },
              { type: 'text', text: ' or ' },
              { type: 'text', text: '3', marks: [{ attrs: { href: '#3' }, type: 'link' }] },
              { type: 'text', text: '?' },
            ],
          },
          {
            type: 'blockquote',
            content: [
              {
                type: 'paragraph',
                content: [
                  { type: 'text', text: 'I ' },
                  { type: 'text', text: 'told', marks: [{ type: 'code' }] },
                  { type: 'text', text: ' you\nso ' },
                  {
                    type: 'text',
                    text: 'here',
                    marks: [{ attrs: { href: '#citation' }, type: 'link' }],
                  },
                  { type: 'text', text: '.' },
                ],
              },
            ],
          },
          { type: 'paragraph', content: [] },
        ],
      });
    });
    it('normalize heading levels', () => {
      const doc = AtlassianDocument.fromMarkdown(`
### Should be 1
#### Should be 2
### Should be 1
`);
      assertEqual(doc, {
        type: 'doc',
        version: 1,
        content: [
          {
            type: 'heading',
            content: [{ type: 'text', text: 'Should be 1' }],
            attrs: { level: 1 },
          },
          {
            type: 'heading',
            content: [{ type: 'text', text: 'Should be 2' }],
            attrs: { level: 2 },
          },
          {
            type: 'heading',
            content: [{ type: 'text', text: 'Should be 1' }],
            attrs: { level: 1 },
          },
          { type: 'paragraph', content: [] },
        ],
      });
    });
  });
});
describe('AdfNode', () => {
  const textToParse = 'Text with `snippet` and [link title](#url).';
  const expectedParsedContent = [
    { type: 'text', text: 'Text with ' },
    { type: 'text', text: 'snippet', marks: [{ type: 'code' }] },
    { type: 'text', text: ' and ' },
    { type: 'text', text: 'link title', marks: [{ type: 'link', attrs: { href: '#url' } }] },
    { type: 'text', text: '.' },
  ];
  it('creates heading with level', () => {
    assertEqual(new AdfNode({ type: 'heading', text: '# Heading' }), {
      type: 'heading',
      attrs: { level: 1 },
      content: [{ type: 'text', text: 'Heading' }],
    });
    assertEqual(new AdfNode({ type: 'heading', text: '## Heading' }), {
      type: 'heading',
      attrs: { level: 2 },
      content: [{ type: 'text', text: 'Heading' }],
    });
    assertEqual(new AdfNode({ type: 'heading', text: '### Heading' }), {
      type: 'heading',
      attrs: { level: 3 },
      content: [{ type: 'text', text: 'Heading' }],
    });
    assertEqual(new AdfNode({ type: 'heading', text: '#### Heading' }), {
      type: 'heading',
      attrs: { level: 4 },
      content: [{ type: 'text', text: 'Heading' }],
    });
    assertEqual(new AdfNode({ type: 'heading', text: '##### Heading' }), {
      type: 'heading',
      attrs: { level: 5 },
      content: [{ type: 'text', text: 'Heading' }],
    });
    assertEqual(new AdfNode({ type: 'heading', text: '###### Heading' }), {
      type: 'heading',
      attrs: { level: 6 },
      content: [{ type: 'text', text: 'Heading' }],
    });
  });
  it('creates heading with parsed text', () => {
    assertEqual(new AdfNode({ type: 'heading', text: `# ${textToParse}` }), {
      type: 'heading',
      content: expectedParsedContent,
      attrs: { level: 1 },
    });
  });
  it('creates blockquote with parsed text', () => {
    assertEqual(new AdfNode({ type: 'blockquote', text: textToParse }), {
      type: 'blockquote',
      content: [{ type: 'paragraph', content: expectedParsedContent }],
    });
  });
  it('creates codeblock without parsed text', () => {
    assertEqual(new AdfNode({ type: 'codeBlock', text: textToParse }), {
      type: 'codeBlock',
      content: [{ type: 'text', text: 'Text with `snippet` and [link title](#url).' }],
    });
  });
  it('creates paragraph with parsed text', () => {
    assertEqual(new AdfNode({ type: 'paragraph', text: textToParse }), {
      type: 'paragraph',
      content: expectedParsedContent,
    });
  });
  it('throws on unsupported block type', () => {
    assert.throws(() => new AdfNode({ type: 'surprise', text: 'Not supported' }), {
      message: 'Unsupported block type: surprise',
    });
  });
});
