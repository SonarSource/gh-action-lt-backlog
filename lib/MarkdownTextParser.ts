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
    if (this.nextIndex >= this.text.length) {
      return null;
    } else if (this.text[this.nextIndex] === '`') {
      return { type: 'code', text: this.readCode() };
    } else if (this.text.startsWith('http://', this.nextIndex) || this.text.startsWith('https://', this.nextIndex)) {
      const href = this.readHref();
      return { type: 'link', text: href, href };
    } else {
      const match = this.matchLink(this.nextIndex);
      if (match == null) {
        return { type: 'text', text: this.readText() };
      } else {
        this.nextIndex += match[0].length;
        return { type: 'link', text: match.groups.title, href: match.groups.href };
      }
    }
  }

  private readText(): string {
    const end = this.nextTokenIndex();
    const result = this.text.substring(this.nextIndex, end);
    this.nextIndex = end;
    return result;
  }

  private nextTokenIndex(): number {
    let index = this.nextIndex;
    let next = new NextIndex(this.text, index);
    while (next.token > 0 || next.link > 0) {
      if (next.token > 0 && (next.link < 0 || next.token < next.link)) {
        return next.token;
      } else if (next.link >= 0) {
        if (this.matchLink(next.link) != null) {
          return next.link;
        } else {
          index = next.link + 1;
          next = new NextIndex(this.text, index);
        }
      }
    }
    return this.text.length;
  }

  private readCode(): string {
    let end = this.text.indexOf('`', this.nextIndex + 1);
    if (end < 0) {
      end = this.text.length;
    }
    const result = this.text.substring(this.nextIndex + 1, end);
    this.nextIndex = end + 1;
    return result;
  }

  private matchLink(index: number): RegExpMatchArray {
    return this.text[index] === '['
      ? this.text.substring(index).match(/^\[(?<title>[^\]]+)\]\((?<href>[^) ]+)\)/)
      : null;
  }

  private readHref(): string {
    const match = this.text.substring(this.nextIndex).match(/^https?:\/\/[^\s,;)]*/);
    let text = match[0];
    while (text.endsWith('?') || text.endsWith('.')) {
      text = text.substring(0, text.length - 1);
    }
    this.nextIndex += text.length;
    return text;
  }
}

class NextIndex {
  public readonly token: number = -1;
  public readonly link: number;

  constructor(text: string, index: number) {
    this.token = this.minToken(text.indexOf('`', index));
    this.token = this.minToken(text.indexOf('http://', index));
    this.token = this.minToken(text.indexOf('https://', index));
    this.link = text.indexOf('[', index); // Might, or might not be a link
    if (this.token === index) {
      throw new Error('This should be called only when current token starts with text.');
    }
  }

  private minToken(candidate: number): number {
    return this.token < 0 || (candidate >= 0 && candidate < this.token)
      ? candidate
      : this.token;
  }
}
