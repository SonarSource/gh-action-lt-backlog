"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const OctokitAction_1 = require("../lib/OctokitAction");
class TrelloSync extends OctokitAction_1.OctokitAction {
    trelloApiKey;
    trelloApiToken;
    constructor() {
        super();
        this.trelloApiKey = this.inputString('trello-api-key');
        this.trelloApiToken = this.inputString('trello-api-token');
    }
    async execute() {
        const pattern = /^[A-Z][A-Z0-9]*-\d+/g;
        const log = [];
        for (const column of ['In Progress', 'Planned']) {
            for (const card of await this.listCards('VXbSw1ia', column)) {
                if (card.start && card.due) {
                    const ids = card.name.match(pattern);
                    if (ids?.length === 1) {
                        const issue = await this.jira.loadIssue(ids[0]);
                        if (issue) {
                            if (!issue.fields.customfield_10001) {
                                log.push(`Epic is missing Team: ${card.name}`);
                            }
                            const start = new Date(card.start).toISOString().split('T')[0];
                            const due = new Date(card.due).toISOString().split('T')[0];
                            if (issue.fields.customfield_10015 === start && issue.fields.duedate === due) {
                                this.log(`SKIP already up to date: ${card.name}`);
                            }
                            else {
                                await this.updateJiraIssue(ids[0], start, due);
                            }
                        }
                        else {
                            log.push(`SKIP nonexistent id: ${card.name}`);
                        }
                    }
                    else {
                        log.push(`SKIP missing id: ${card.name}`);
                    }
                }
                else {
                    log.push(`SKIP date: ${card.name}`);
                }
            }
        }
        this.log('--- ALL ---');
        for (const line of log) {
            this.log(line);
        }
    }
    async updateJiraIssue(id, start, due) {
        this.log(`Updating ${id}: ${start}, ${due}`);
        const request = {
            fields: {
                customfield_10015: start,
                duedate: due
            }
        };
        await this.jira.sendRestPutApi(`issue/${id}?notifyUsers=false`, request);
    }
    async listCards(boardId, columnName) {
        const list = (await this.fetchTrello(`boards/${boardId}/lists`)).find(x => x.name === columnName);
        if (list) {
            return this.fetchTrello(`lists/${list.id}/cards`);
        }
        else {
            throw new Error(`Column "${columnName}" not found on board "${boardId}".`);
        }
    }
    async fetchTrello(path) {
        const response = await fetch(`https://api.trello.com/1/${path}?key=${this.trelloApiKey}&token=${this.trelloApiToken}`);
        if (response.ok) {
            return response.json();
        }
        else {
            throw new Error(`Failed to fetch ${path}: ${response.statusText}`);
        }
    }
}
const action = new TrelloSync();
action.run();
//# sourceMappingURL=TrelloSync.js.map