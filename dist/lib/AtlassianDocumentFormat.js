/*
 * Backlog Automation
 * Copyright (C) SonarSource Sàrl
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
import { MarkdownParser } from "./MarkdownParser.js";
import { MarkdownTextParser } from "./MarkdownTextParser.js";
export class AtlassianDocument {
    type = 'doc';
    version = 1;
    content;
    constructor(content) {
        this.content = content;
    }
    static fromMarkdown(markdown) {
        const contents = [];
        const parser = new MarkdownParser(markdown);
        let block;
        while (block = parser.readBlock()) {
            contents.push(new AdfNode(block));
        }
        this.normalizeHeadings(contents);
        return new AtlassianDocument(contents);
    }
    truncate(maxSerializedLength, truncationNotice) {
        if (JSON.stringify(this).length <= maxSerializedLength) {
            return this;
        }
        const notice = new AdfNode({ type: 'paragraph', text: truncationNotice });
        let truncated = new AtlassianDocument([notice]);
        if (JSON.stringify(truncated).length > maxSerializedLength) {
            throw new Error('The truncation notice exceeds the maximum serialized ADF length');
        }
        let minTextLength = 0;
        let maxTextLength = AtlassianDocument.textLength(this.content);
        while (minTextLength <= maxTextLength) {
            const textLength = Math.floor((minTextLength + maxTextLength) / 2);
            const candidate = new AtlassianDocument([
                ...AtlassianDocument.truncateContent(this.content, textLength),
                notice,
            ]);
            if (JSON.stringify(candidate).length <= maxSerializedLength) {
                truncated = candidate;
                minTextLength = textLength + 1;
            }
            else {
                maxTextLength = textLength - 1;
            }
        }
        return truncated;
    }
    static textLength(nodes) {
        return nodes.reduce((length, node) => length + (node.text ? Array.from(node.text).length : 0) + this.textLength(node.content ?? []), 0);
    }
    static truncateContent(nodes, maxTextLength) {
        const state = { remainingTextLength: maxTextLength };
        const result = [];
        for (const node of nodes) {
            const truncated = this.truncateNode(node, state);
            if (truncated) {
                result.push(truncated);
            }
            if (state.remainingTextLength === 0) {
                break;
            }
        }
        return result;
    }
    static truncateNode(node, state) {
        if (node.text != null) {
            if (state.remainingTextLength === 0) {
                return null;
            }
            const characters = Array.from(node.text);
            const text = characters.slice(0, state.remainingTextLength).join('');
            state.remainingTextLength -= Math.min(characters.length, state.remainingTextLength);
            return { ...node, text };
        }
        const content = this.truncateContent(node.content ?? [], state.remainingTextLength);
        state.remainingTextLength -= AtlassianDocument.textLength(content);
        return content.length > 0 ? { ...node, content } : null;
    }
    static normalizeHeadings(nodes) {
        const headings = nodes.filter(x => x.type === 'heading');
        if (headings.length > 0) {
            const min = headings.reduce((min, x) => Math.min(min, x.attrs.level), 6);
            for (const node of headings) {
                node.attrs.level -= min - 1; // Normalize to start from 1
            }
        }
    }
}
export class AdfNode {
    type;
    content;
    attrs;
    marks;
    text;
    constructor(block) {
        this.type = block.type;
        switch (block.type) {
            case 'heading': {
                const level = block.text.indexOf(' ');
                this.attrs = { level };
                this.content = AdfNode.parseText(block.text.substring(level + 1));
                break;
            }
            case 'blockquote': {
                this.content = [
                    {
                        type: 'paragraph',
                        content: AdfNode.parseText(block.text)
                    }
                ];
                break;
            }
            case 'codeBlock': {
                this.content = [{ type: 'text', text: block.text }]; // No inner parsing
                break;
            }
            case 'paragraph': {
                this.content = AdfNode.parseText(block.text);
                break;
            }
            default:
                throw new Error(`Unsupported block type: ${block.type}`);
        }
    }
    static parseText(text) {
        const nodes = [];
        const parser = new MarkdownTextParser(text);
        let block;
        while (block = parser.readBlock()) {
            switch (block.type) {
                case 'code': {
                    nodes.push({
                        type: 'text',
                        text: block.text,
                        marks: [{ type: 'code' }]
                    });
                    break;
                }
                case 'link': {
                    nodes.push({
                        type: 'text',
                        text: block.text,
                        marks: [{ type: 'link', attrs: { href: block.href } }]
                    });
                    break;
                }
                case 'text': {
                    nodes.push({
                        type: 'text',
                        text: block.text
                    });
                    break;
                }
                default:
                    throw new Error(`Unsupported text block type: ${block.type}`);
            }
        }
        return nodes;
    }
}
//# sourceMappingURL=AtlassianDocumentFormat.js.map