import { OctokitAction } from "../lib/OctokitAction";

interface Card {
  id: string;
  name: string;
  start?: string;
  due?: string;
}

class TrelloSync extends OctokitAction {

  private readonly trelloApiKey: string;
  private readonly trelloApiToken: string;

  constructor() {
    super();
    this.trelloApiKey = this.getInput('trello-api-key');
    this.trelloApiToken = this.getInput('trello-api-token');
  }

  protected async execute(): Promise<void> {
    const pattern: RegExp = /^[A-Z][A-Z0-9]*-\d+/g;
    for (const card of await this.listCards('VXbSw1ia', 'Planned')) {
      if (card.start && card.due) {
        const ids = card.name.match(pattern);
        if (ids && ids.length === 1) {
          await this.updateIssue(ids[0], new Date(card.start).toISOString().split('T')[0], new Date(card.due).toISOString().split('T')[0]);
        } else {
          this.log(`SKIP missing id: ${card.name}`);
        }
      } else {
        this.log(`SKIP date: ${card.name}`);
      }
    }
  }

  private async updateIssue(id: string, start: string, due: string): Promise<void> {
    this.log(`Updating ${id}: ${start}, ${due}`);
    const request = {
      fields: {
        customfield_10015: start,
        duedate: due
      }
    }
    await this.jira.sendRestPutApi(`issue/${id}`, request);
  }

  private async listCards(boardId: string, columnName: string): Promise<Card[]> {
    const list = (await this.fetchTrello(`boards/${boardId}/lists`)).find(x => x.name === columnName);
    if (list) {
      return this.fetchTrello(`lists/${list.id}/cards`);
    } else {
      throw new Error(`Column "${columnName}" not found on board "${boardId}".`);
    }
  }

  private async fetchTrello(path: string): Promise<any> {
    const response = await fetch(`https://api.trello.com/1/${path}?key=${this.trelloApiKey}&token=${this.trelloApiToken}`);
    if (response.ok) {
      return response.json();
    } else {
      throw new Error(`Failed to fetch ${path}: ${response.statusText}`);
    }
  }

}
const action = new TrelloSync();
action.run();
