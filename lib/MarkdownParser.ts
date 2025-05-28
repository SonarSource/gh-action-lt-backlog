
export interface Block {
  type: 'heading' | 'paragraph' | 'codeBlock';
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
    } else if (this.isCodeBlock(line)) {
      let text = "";
      while (this.nextIndex < this.lines.length && !this.isCodeBlock(this.lines[this.nextIndex])) {
        text += (text ? '\n' : '') + this.lines[this.nextIndex++];
      }
      this.nextIndex++; // Skip the closing code block line
      return { type: 'codeBlock', text };
    } else {
      let text = line;
      while (this.nextIndex < this.lines.length && this.isParagraph(this.lines[this.nextIndex])) {
        text += '\n' + this.lines[this.nextIndex++];
      }
      return { type: 'paragraph', text };
    }
  }

  private isParagraph(line: string): boolean {
    return !this.isHeading(line) && !this.isCodeBlock(line);
  }

  private isHeading(line: string): boolean {
    return /^#{1,6} /.test(line);
  }

  private isCodeBlock(line: string): boolean {
    return /^```\w*$/.test(line);
  }
}
