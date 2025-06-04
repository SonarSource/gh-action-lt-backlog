import { Block, MarkdownParser } from "./MarkdownParser";
import { MarkdownTextParser, TextBlock } from "./MarkdownTextParser";

export class AtlassianDocument {
  type: string = 'doc';
  version: number = 1;
  content: AdfNode[];

  constructor(content: AdfNode[]) {
    this.content = content;
  }

  static fromUrl(url: string): AtlassianDocument {
    return new AtlassianDocument([
      {
        type: 'paragraph',
        content: [
          {
            type: 'inlineCard',
            attrs: { url }
          }
        ]
      }
    ]);
  }

  static fromMarkdown(markdown: string): AtlassianDocument {
    const contents: AdfNode[] = [];
    const parser = new MarkdownParser(markdown);
    let block: Block;
    while (block = parser.readBlock()) {
      contents.push(new AdfNode(block));
    }
    this.normalizeHeadings(contents);
    return new AtlassianDocument(contents);
  }

  static normalizeHeadings(nodes: AdfNode[]): void {
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
  type:
    // Top-level blocks
    | 'blockquote'
    | 'bulletList'
    | 'codeBlock'
    | 'expand'
    | 'heading'
    | 'mediaGroup'
    | 'mediaSingle'
    | 'multiBodiedExtension'
    | 'orderedList'
    | 'panel'
    | 'paragraph'
    | 'rule'
    | 'table'
    // Child blocks
    | 'extensionFrame'
    | 'listItem'
    | 'media'
    | 'nestedExpand'
    | 'tableCell'
    | 'tableHeader'
    | 'tableRow'
    // Inline
    | 'date'
    | 'emoji'
    | 'hardBreak'
    | 'inlineCard'
    | 'mediaInline'
    | 'mention'
    | 'status'
    | 'text';
  content?: AdfNode[];
  attrs?: Record<string, any>;
  marks?: AdfMark[];
  text?: string;

  public constructor(block: Block = null) {
    if (block) {
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
          this.content = [{ type: 'text', text: block.text }];  // No inner parsing
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
  }

  private static parseText(text: string): AdfNode[] {
    const nodes: AdfNode[] = [];
    const parser = new MarkdownTextParser(text);
    let block: TextBlock;
    
    while (block = parser.readBlock()) {

      //console.log(block);

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

    //console.log("EOI");

    return nodes;
  }
}

export interface AdfMark {
  type: 'border' | 'code' | 'em' | 'link' | 'strike' | 'strong' | 'subsup' | 'textColor' | 'underline';
  attrs?: any;
}
