import { Block, MarkdownParser } from "./MarkdownParser";

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
    return new AtlassianDocument(contents);
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
    // FIXME: Normalize headers

    // FIXME: Links
    // FIXME: Text quotes

    if (block) {
      this.type = block.type;
      switch (block.type) {
        case 'heading': {
          const level = block.text.indexOf(' ');
          this.attrs = { level };
          this.content = [
            {
              type: 'text',
              text: block.text.substring(level + 1)
            }
          ];
          break;
        }
        case 'blockquote': {
          this.content = [
            {
              type: 'paragraph',
              content: [
                {
                  type: 'text',
                  text: block.text
                }
              ]
            }
          ];
          break;
        }
        case 'codeBlock':
        case 'paragraph': {
          this.content = [
            {
              type: 'text',
              text: block.text
            }
          ];
          break;
        }
        default:
          throw new Error(`Unsupported block type: ${block.type}`);
      }
    }
  }
}

export interface AdfMark {
  type: 'border' | 'code' | 'em' | 'link' | 'strike' | 'strong' | 'subsup' | 'textColor' | 'underline';
  attrs?: string;
}
