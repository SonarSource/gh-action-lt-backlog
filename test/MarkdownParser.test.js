import { assertEqual } from './support/Assertions.js';
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { MarkdownParser } from '../src/helpers/MarkdownParser.js';
describe('MarkdownParser', () => {
  it('parses paragraph', () => {
    const parser = new MarkdownParser('Lorem ipsum\nDolor sit amet');
    assertEqual(parser.readBlock(), {
      type: 'paragraph',
      text: 'Lorem ipsum\nDolor sit amet',
    });
    assert.strictEqual(parser.readBlock(), null);
  });
  it('parses paragraph with inner content', () => {
    const parser = new MarkdownParser('Text `snippet` and [link](#url).');
    assertEqual(parser.readBlock(), {
      type: 'paragraph',
      text: 'Text `snippet` and [link](#url).',
    });
    assert.strictEqual(parser.readBlock(), null);
  });
  it('parses headings', () => {
    const parser = new MarkdownParser(`
# Heading 1
## Heading 2
### Heading 3
#### Heading 4
##### Heading 5
###### Heading 6
####### What's going on in this paragraph?
#This is not heading
#
`);
    assertEqual(parser.readBlock(), { type: 'heading', text: '# Heading 1' });
    assertEqual(parser.readBlock(), { type: 'heading', text: '## Heading 2' });
    assertEqual(parser.readBlock(), { type: 'heading', text: '### Heading 3' });
    assertEqual(parser.readBlock(), { type: 'heading', text: '#### Heading 4' });
    assertEqual(parser.readBlock(), { type: 'heading', text: '##### Heading 5' });
    assertEqual(parser.readBlock(), { type: 'heading', text: '###### Heading 6' });
    assertEqual(parser.readBlock(), {
      type: 'paragraph',
      text: "####### What's going on in this paragraph?\n#This is not heading\n#\n",
    });
    assert.strictEqual(parser.readBlock(), null);
  });
  it('parses code block', () => {
    const parser = new MarkdownParser(`
\`\`\`vbnet
VB.NET
\`\`\`
\`\`\`C#
CSharp;
{
}
\`\`\`
\`\`\`Whatever#
What?
\`\`\`
\`\`\`
No language
\`\`\`
`);
    assertEqual(parser.readBlock(), { type: 'codeBlock', text: 'VB.NET' });
    assertEqual(parser.readBlock(), { type: 'codeBlock', text: 'CSharp;\n{\n}' });
    assertEqual(parser.readBlock(), { type: 'codeBlock', text: 'What?' });
    assertEqual(parser.readBlock(), { type: 'codeBlock', text: 'No language' });
    assertEqual(parser.readBlock(), { type: 'paragraph', text: '' });
    assert.strictEqual(parser.readBlock(), null);
  });
  it('parses blockquote', () => {
    const parser = new MarkdownParser(`
> Single line

> Two
> lines

>No space

>> Nested more

>>> Deeply nested
`);
    assertEqual(parser.readBlock(), { type: 'blockquote', text: 'Single line' });
    assertEqual(parser.readBlock(), { type: 'blockquote', text: 'Two\nlines' });
    assertEqual(parser.readBlock(), { type: 'blockquote', text: 'No space' });
    assertEqual(parser.readBlock(), { type: 'blockquote', text: '> Nested more' });
    assertEqual(parser.readBlock(), { type: 'blockquote', text: '>> Deeply nested' });
    assertEqual(parser.readBlock(), { type: 'paragraph', text: '' });
    assert.strictEqual(parser.readBlock(), null);
  });
  it('parses mixed content', () => {
    const parser = new MarkdownParser(`
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
    assertEqual(parser.readBlock(), { type: 'heading', text: '# Heading 1' });
    assertEqual(parser.readBlock(), {
      type: 'paragraph',
      text: 'Intro `snippet` and [link](#url).\n',
    });
    assertEqual(parser.readBlock(), { type: 'heading', text: '## Heading 2' });
    assertEqual(parser.readBlock(), {
      type: 'codeBlock',
      text: '[This is not a](link)\nAnd this is not a `snippet`.\nThis is a reproducer code block.',
    });
    assertEqual(parser.readBlock(), { type: 'paragraph', text: 'Code comment\n' });
    assertEqual(parser.readBlock(), { type: 'heading', text: '# Heading `1` or [3](#3)?' });
    assertEqual(parser.readBlock(), {
      type: 'blockquote',
      text: 'I `told` you\nso [here](#citation).',
    });
    assertEqual(parser.readBlock(), { type: 'paragraph', text: '' });
    assert.strictEqual(parser.readBlock(), null);
  });
  it('skips empty lines before blocks', () => {
    const parser = new MarkdownParser(`


# Heading preceded by empty lines


Paragraph text preceded and followed by empty lines.


`);
    assertEqual(parser.readBlock(), {
      type: 'heading',
      text: '# Heading preceded by empty lines',
    });
    assertEqual(parser.readBlock(), {
      type: 'paragraph',
      text: 'Paragraph text preceded and followed by empty lines.\n\n\n',
    });
    assert.strictEqual(parser.readBlock(), null);
  });
  it('handles empty string', () => {
    const parser = new MarkdownParser('');
    assertEqual(parser.readBlock(), { type: 'paragraph', text: '' });
    assert.strictEqual(parser.readBlock(), null);
  });
});
