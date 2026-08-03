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
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { JiraClient } from './JiraClient.js';
import { LogTester } from '../tests/LogTester.js';
const jql = 'project = "NET" AND status = "In Validation"';
const encoded = encodeURIComponent(jql);
const endpoint = (token) => `search/jql?fields=key,assignee&jql=${encoded}${token ? `&nextPageToken=${encodeURIComponent(token)}` : ''}`;
function stubClient(respond) {
    const client = new JiraClient('https://jira.example', 'site-id', 'org-id', 'fake', 'fake');
    const endpoints = [];
    client.sendRestGetApi = async (requested) => {
        endpoints.push(requested);
        return respond(requested);
    };
    return { client, endpoints };
}
describe('JiraClient.findAllIssues', () => {
    let logTester;
    beforeEach(() => {
        logTester = new LogTester();
    });
    afterEach(() => {
        logTester?.afterEach();
    });
    it('fetches a single page when there is no next-page token', async () => {
        const { client, endpoints } = stubClient(() => ({ issues: [{ key: 'ABC-1' }, { key: 'ABC-2' }], isLast: true }));
        const result = await client.findAllIssues(jql);
        expect(result.map(x => x.key)).toStrictEqual(['ABC-1', 'ABC-2']);
        expect(endpoints).toStrictEqual([endpoint()]);
    });
    it('follows nextPageToken until the last page', async () => {
        const pages = [
            { issues: [{ key: 'ABC-1' }, { key: 'ABC-2' }], nextPageToken: 't1' },
            { issues: [{ key: 'ABC-3' }], isLast: true },
        ];
        const { client, endpoints } = stubClient(() => pages.shift());
        const result = await client.findAllIssues(jql);
        expect(result.map(x => x.key)).toStrictEqual(['ABC-1', 'ABC-2', 'ABC-3']);
        expect(endpoints).toStrictEqual([endpoint(), endpoint('t1')]);
    });
    it('returns an empty array when there are no issues', async () => {
        const { client, endpoints } = stubClient(() => ({ issues: [], isLast: true }));
        expect(await client.findAllIssues(jql)).toStrictEqual([]);
        expect(endpoints).toStrictEqual([endpoint()]);
    });
    it('throws when the first page request fails', async () => {
        const { client } = stubClient(() => null);
        await expect(client.findAllIssues(jql)).rejects.toThrow('Failed to fetch issues page (token: first)');
    });
    it('throws when a subsequent page request fails', async () => {
        const pages = [{ issues: [{ key: 'ABC-1' }], nextPageToken: 't1' }, null];
        const { client } = stubClient(() => pages.shift());
        await expect(client.findAllIssues(jql)).rejects.toThrow('Failed to fetch issues page (token: t1)');
    });
});
//# sourceMappingURL=JiraClient.findAllIssues.test.js.map