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

type SlackResponse = {
  ok?: boolean;
  error?: string;
}

type SlackUserResponse = {
  user?: {
    id: string;
  };
}

export class SlackClient {
  private readonly token: string;
  private readonly channel: string;

  constructor(token: string, channel: string) {
    this.token = token;
    this.channel = channel;
  }

  public async sendMessage(text: string): Promise<void> {
    if (this.channel) {
      console.log("Sending Slack message");
      await this.sendPost("https://slack.com/api/chat.postMessage", { channel: this.channel, text });
    } else {
      console.log("Skip sending slack message, channel was not set.")
    }
  }

  public async findUserByEmail(email: string): Promise<string | null> {
    const response = await this.sendGet<SlackUserResponse>("https://slack.com/api/users.lookupByEmail", { email });
    return response?.user?.id ?? null;
  }

  private sendGet<T>(url: string, params: Record<string, string>): Promise<T | null> {
    return this.sendRequest<T>(`${url}?${new URLSearchParams(params)}`, { method: "GET" });
  }

  private sendPost(url: string, jsonRequest: Record<string, unknown>): Promise<unknown> {
    const body = JSON.stringify(jsonRequest);
    console.log(`Sending slack POST: ${body}`);
    return this.sendRequest(url, {
      method: "POST",
      body,
      headers: { "Content-Type": "application/json; charset=utf-8" },
    });
  }

  private async sendRequest<T>(url: string, options: RequestInit): Promise<T | null> {
    if (!this.token) {
      throw new Error("slack-token was not set");
    }
    try {
      const response = await fetch(url, {
        ...options,
        headers: { authorization: `Bearer ${this.token}`, ...options.headers },
      });
      if (!response.ok) {
        console.log(`Failed to send API request. Error ${response.status}: ${response.statusText}`);
        return null;
      }
      const data = await response.json() as T & SlackResponse;
      if (!data.ok) {
        console.log(`Failed to send API request. Error: ${data.error}`);
        return null;
      }
      return data;
    } catch (ex) {
      console.log("Failed to send Slack request");
      console.log((ex as Error).toString());
      return null;
    }
  }
}
