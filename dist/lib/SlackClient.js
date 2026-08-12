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
export class SlackClient {
    token;
    channel;
    constructor(token, channel) {
        this.token = token;
        this.channel = channel;
    }
    async sendMessage(text) {
        if (this.channel) {
            console.log("Sending Slack message");
            await this.sendPost("https://slack.com/api/chat.postMessage", { channel: this.channel, text });
        }
        else {
            console.log("Skip sending slack message, channel was not set.");
        }
    }
    async findUserByEmail(email) {
        const response = await this.sendGet("https://slack.com/api/users.lookupByEmail", { email });
        return response?.user?.id ?? null;
    }
    sendGet(url, params) {
        return this.sendRequest(`${url}?${new URLSearchParams(params)}`, { method: "GET" });
    }
    sendPost(url, jsonRequest) {
        const body = JSON.stringify(jsonRequest);
        console.log(`Sending slack POST: ${body}`);
        return this.sendRequest(url, {
            method: "POST",
            body,
            headers: { "Content-Type": "application/json; charset=utf-8" },
        });
    }
    async sendRequest(url, options) {
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
            const data = await response.json();
            if (!data.ok) {
                console.log(`Failed to send API request. Error: ${data.error}`);
                return null;
            }
            return data;
        }
        catch (ex) {
            console.log("Failed to send Slack request");
            console.log(ex.toString());
            return null;
        }
    }
}
//# sourceMappingURL=SlackClient.js.map