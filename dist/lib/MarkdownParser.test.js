"use strict";
/*
 * Backlog Automation
 * Copyright (C) 2022-2025 SonarSource Sàrl
 * mailto: info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 3 of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with this program; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const MarkdownParser_1 = require("./MarkdownParser");
describe('MarkdownParser', () => {
    it('parses paragraph', () => {
        const parser = new MarkdownParser_1.MarkdownParser('Lorem ipsum\nDolor sit amet');
        expect(parser.readBlock()).toEqual({ type: 'paragraph', text: 'Lorem ipsum\nDolor sit amet' });
        expect(parser.readBlock()).toBeNull();
    });
    it('parses paragraph with inner content', () => {
        const parser = new MarkdownParser_1.MarkdownParser('Text `snippet` and [link](#url).');
        expect(parser.readBlock()).toEqual({ type: 'paragraph', text: 'Text `snippet` and [link](#url).' });
        expect(parser.readBlock()).toBeNull();
    });
    it('parses headings', () => {
        const parser = new MarkdownParser_1.MarkdownParser(`
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
        expect(parser.readBlock()).toEqual({ type: 'heading', text: '# Heading 1' });
        expect(parser.readBlock()).toEqual({ type: 'heading', text: '## Heading 2' });
        expect(parser.readBlock()).toEqual({ type: 'heading', text: '### Heading 3' });
        expect(parser.readBlock()).toEqual({ type: 'heading', text: '#### Heading 4' });
        expect(parser.readBlock()).toEqual({ type: 'heading', text: '##### Heading 5' });
        expect(parser.readBlock()).toEqual({ type: 'heading', text: '###### Heading 6' });
        expect(parser.readBlock()).toEqual({ type: 'paragraph', text: "####### What's going on in this paragraph?\n#This is not heading\n#\n" });
        expect(parser.readBlock()).toBeNull();
    });
    it('parses code block', () => {
        const parser = new MarkdownParser_1.MarkdownParser(`
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
        expect(parser.readBlock()).toEqual({ type: 'codeBlock', text: 'VB.NET' });
        expect(parser.readBlock()).toEqual({ type: 'codeBlock', text: 'CSharp;\n{\n}' });
        expect(parser.readBlock()).toEqual({ type: 'codeBlock', text: 'What?' });
        expect(parser.readBlock()).toEqual({ type: 'codeBlock', text: 'No language' });
        expect(parser.readBlock()).toEqual({ type: 'paragraph', text: '' });
        expect(parser.readBlock()).toBeNull();
    });
    it('parses blockquote', () => {
        const parser = new MarkdownParser_1.MarkdownParser(`
> Single line

> Two
> lines

>No space

>> Nested more

>>> Deeply nested
`);
        expect(parser.readBlock()).toEqual({ type: 'blockquote', text: 'Single line' });
        expect(parser.readBlock()).toEqual({ type: 'blockquote', text: 'Two\nlines' });
        expect(parser.readBlock()).toEqual({ type: 'blockquote', text: 'No space' });
        expect(parser.readBlock()).toEqual({ type: 'blockquote', text: '> Nested more' });
        expect(parser.readBlock()).toEqual({ type: 'blockquote', text: '>> Deeply nested' });
        expect(parser.readBlock()).toEqual({ type: 'paragraph', text: '' });
        expect(parser.readBlock()).toBeNull();
    });
    it('parses mixed content', () => {
        const parser = new MarkdownParser_1.MarkdownParser(`
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
        expect(parser.readBlock()).toEqual({ type: 'heading', text: '# Heading 1' });
        expect(parser.readBlock()).toEqual({ type: 'paragraph', text: 'Intro `snippet` and [link](#url).\n' });
        expect(parser.readBlock()).toEqual({ type: 'heading', text: '## Heading 2' });
        expect(parser.readBlock()).toEqual({ type: 'codeBlock', text: '[This is not a](link)\nAnd this is not a `snippet`.\nThis is a reproducer code block.' });
        expect(parser.readBlock()).toEqual({ type: 'paragraph', text: 'Code comment\n' });
        expect(parser.readBlock()).toEqual({ type: 'heading', text: '# Heading `1` or [3](#3)?' });
        expect(parser.readBlock()).toEqual({ type: 'blockquote', text: 'I `told` you\nso [here](#citation).' });
        expect(parser.readBlock()).toEqual({ type: 'paragraph', text: '' });
        expect(parser.readBlock()).toBeNull();
    });
    it('skips empty lines before blocks', () => {
        const parser = new MarkdownParser_1.MarkdownParser(`


# Heading preceded by empty lines


Paragraph text preceded and followed by empty lines.


`);
        expect(parser.readBlock()).toEqual({ type: 'heading', text: '# Heading preceded by empty lines' });
        expect(parser.readBlock()).toEqual({ type: 'paragraph', text: 'Paragraph text preceded and followed by empty lines.\n\n\n' });
        expect(parser.readBlock()).toBeNull();
    });
    it('handles empty string', () => {
        const parser = new MarkdownParser_1.MarkdownParser('');
        expect(parser.readBlock()).toEqual({ type: 'paragraph', text: '' });
        expect(parser.readBlock()).toBeNull();
    });
});
//# sourceMappingURL=MarkdownParser.test.js.map