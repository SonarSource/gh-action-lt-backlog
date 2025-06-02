
export interface TextBlock {
  type: 'text' | 'code' | 'link';
  text: string;
  href?: string;
}

export class MarkdownTextParser {
  private readonly text: string;
  private nextIndex: number = 0;

  public constructor(text: string) {
    this.text = text;
  }

  public readBlock(): TextBlock {

    console.log(`readBlock ${this.nextIndex}: ${this.text.substring(this.nextIndex, this.nextIndex + 20)}`)

    if (this.nextIndex >= this.text.length) {
      return null;
    } else if (this.text[this.nextIndex] === '`') {
      this.nextIndex++;
      const text = this.readUntil('`');
      this.nextIndex++;
      return { type: 'code', text };
    } else {
      return { type: 'text', text: this.readUntil('`') }; // FIXME: Or any other well-known token
    }
  }

  private readUntil(delimiter: string): string {
    let end = this.text.indexOf(delimiter, this.nextIndex);
    if (end < 0) {
      end = this.text.length;
    }
    const result = this.text.substring(this.nextIndex, end);
    this.nextIndex = end;
    return result;
  }
}
