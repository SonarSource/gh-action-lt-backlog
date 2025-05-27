
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
}

export interface AdfNode {
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
}

export interface AdfMark {
  type: 'border' | 'code' | 'em' | 'link' | 'strike' | 'strong' | 'subsup' | 'textColor' | 'underline';
  attrs?: string;
}
