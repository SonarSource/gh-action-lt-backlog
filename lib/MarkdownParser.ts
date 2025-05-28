
export interface Block {
  type: 'heading' | 'paragraph' | 'codeBlock' | 'blockquote';
  text: string;
}

export class MarkdownParser {
  private readonly lines: string[];
  private nextIndex: number = 0;

  public constructor(markdown: string) {
    this.lines = markdown.split('\n').map(line => line.trimEnd());
  }

  public readBlock(): Block {
    if (!this.canRead()) {
      return null;
    }
    let line: string = this.readLine();
    while (line.trim() === '' && this.canRead()) {
      line = this.readLine();
    }
    if (this.isHeading(line)) {
      return { type: 'heading', text: line };
    } else if (this.isCodeBlock(line)) {
      return { type: 'codeBlock', text: this.readCodeBlock() };
    } else if (this.isBlockQuote(line)) {
      return { type: 'blockquote', text: this.readBlockquote(line) };
    } else {
      return { type: 'paragraph', text: this.readParagraph(line) };
    }
  }

  private canRead(): boolean {
    return this.nextIndex < this.lines.length;
  }

  private readLine(): string {
    return this.lines[this.nextIndex++];
  }

  private readCodeBlock(): string {
    let text = "";
    while (this.nextIndex < this.lines.length && !this.isCodeBlock(this.lines[this.nextIndex])) {
      text += (text ? '\n' : '') + this.readLine();
    }
    this.nextIndex++; // Skip the closing code block line
    return text;
  }

  private readBlockquote(line: string): string {
    let text = line.substring(1).trimStart();
    while (this.nextIndex < this.lines.length && this.isBlockQuote(this.lines[this.nextIndex])) {
      text += '\n' + this.readLine().substring(1).trimStart();
    }
    return text;
  }

  private readParagraph(line: string): string {
    let text = line;
    while (this.nextIndex < this.lines.length && this.isParagraph(this.lines[this.nextIndex])) {
      text += '\n' + this.readLine();
    }
    return text;
  }

  private isParagraph(line: string): boolean {
    return !this.isHeading(line) && !this.isCodeBlock(line) && !this.isBlockQuote(line);
  }

  private isHeading(line: string): boolean {
    return /^#{1,6} /.test(line);
  }

  private isCodeBlock(line: string): boolean {
    return /^```\w*$/.test(line);
  }

  private isBlockQuote(line: string): boolean {
    return line.startsWith('>');
  }
}
