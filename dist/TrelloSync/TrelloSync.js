"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const OctokitAction_1 = require("../lib/OctokitAction");
class TrelloSync extends OctokitAction_1.OctokitAction {
    trelloApiKey;
    trelloApiToken;
    constructor() {
        super();
        this.trelloApiKey = this.getInput('trello-api-key');
        this.trelloApiToken = this.getInput('trello-api-token');
    }
    async execute() {
        const pattern = /^[A-Z][A-Z0-9]*-\d+/g;
        const log = [];
        for (const card of await this.listCards('VXbSw1ia', 'Planned')) {
            if (card.start && card.due) {
                const ids = card.name.match(pattern);
                if (ids && ids.length === 1) {
                    await this.updateIssue(ids[0], new Date(card.start).toISOString().split('T')[0], new Date(card.due).toISOString().split('T')[0]);
                }
                else {
                    log.push(`SKIP missing id: ${card.name}`);
                    this.log(`SKIP missing id: ${card.name}`);
                }
            }
            else {
                log.push(`SKIP date: ${card.name}`);
                this.log(`SKIP date: ${card.name}`);
            }
        }
        this.log('--- ALL SKIP ---');
        for (const line of log) {
            this.log(line);
        }
    }
    async updateIssue(id, start, due) {
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