
export interface Block {
  type: 'heading' | 'paragraph';
  text: string;
}

export class MarkdownParser {
  private readonly lines: string[];
  private nextIndex: number = 0;

  public constructor(markdown: string) {
    this.lines = markdown.split('\n').map(line => line.trimEnd());
  }

  public readBlock(): Block {
    if (this.nextIndex >= this.lines.length) {
      return null;
    }
    const line = this.lines[this.nextIndex++];
    if (this.isHeading(line)) {
      return { type: 'heading', text: line };
    } else {
      return { type: 'paragraph', text: line };
    }
  }

  private isParagraph(line: string): boolean {
    return !this.isHeading(line);
  }

  private isHeading(line: string): boolean {
    return /^#{1,6} /.test(line);
  }
}
