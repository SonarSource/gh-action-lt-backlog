import { OctokitAction } from './OctokitAction';
import { IssueOrPR } from './IssueOrPR';
import { ProjectColumn } from './OctokitTypes';
import type { GraphQlQueryResponseData } from '@octokit/graphql';

export type Card = {
  id: string;
  columnName: string;
};

export abstract class ProjectContent {
  protected readonly action: OctokitAction;
  protected readonly columns: ProjectColumn[];

  public abstract findCard(issueOrPR: IssueOrPR): Promise<Card>;
  public abstract moveCard(card: Card, column_id: number): Promise<void>;

  protected constructor(action: OctokitAction, columns: ProjectColumn[]) {
    this.action = action;
    this.columns = columns;
  }

  public async moveOrCreateCard(issueOrPR: IssueOrPR, column_id: number): Promise<void> {
    const card = await this.findCard(issueOrPR);
    if (card) {
      await this.moveCard(card, column_id);
    } else {
      await this.createCardCore(issueOrPR, column_id);
    }
  }

  public async createCard(issueOrPR: IssueOrPR, column_id: number): Promise<void> {
    const card = await this.findCard(issueOrPR);
    if (card) {
      this.action.log(`Card already exists for #${issueOrPR.number} in ${card.columnName}`);
    } else {
      await this.createCardCore(issueOrPR, column_id);
    }
  }

  public columnFromName(columnName: string): ProjectColumn {
    const columns = this.columns.filter(x => x.name === columnName);
    if (columns.length === 0) {
      this.action.log("Column doesn't exist: " + columnName);
      return null;
    } else {
      return columns[0];
    }
  }

  private async createCardCore(issueOrPR: IssueOrPR, column_id: number): Promise<void> {
    const content_type = issueOrPR.url.indexOf('/pulls/') < 0 ? 'Issue' : 'PullRequest';
    const content_id = issueOrPR.id;
    this.action.log(`Creating ${content_type} card for #${issueOrPR.number}`);
    try {
      const { data: card } = await this.action.rest.projects.createCard({ column_id, content_id, content_type });
      await this.action.rest.projects.moveCard({  // Move it to the bottom of the column
        card_id: card.id,
        position: 'bottom',
        column_id,
      });
    }
    catch (ex) {  // Issues or PRs can be assigned to a project in "Awaiting triage" state. Those are not discoverable via REST API
      this.action.log(`Failed to create a card: ${ex}`);
    }
  }
}

export class ProjectContentV1 extends ProjectContent {
  public static async fromColumn(
    action: OctokitAction,
    column_id: number,
  ): Promise<ProjectContent> {
    const { data: column } = await action.rest.projects.getColumn({ column_id });
    const project_id = parseInt(column.project_url.split('/').pop());
    return ProjectContentV1.fromProject(action, project_id);
  }

  public static async fromProject(
    action: OctokitAction,
    project_id: number,
  ): Promise<ProjectContent> {
    const { data: columns } = await action.rest.projects.listColumns({ project_id });
    return new ProjectContentV1(action, columns);
  }

  public async findCard(issueOrPR: IssueOrPR): Promise<Card> {
    // We should start caching these results in case we need to call it multiple times from a single action
    const content_url = issueOrPR.issue_url ?? issueOrPR.url;
    for (const column of this.columns) {
      const { data: cards } = await this.action.rest.projects.listCards({ column_id: column.id });
      const card = cards.find(x => x.content_url == content_url);
      if (card) {
        return { id: card.id.toString(), columnName: card.column_url };
      }
    }
    this.action.log(`Card not found for: ${content_url}`);
    return null;
  }

  public async moveCard(card: Card, column_id: number): Promise<void> {
    console.log(`Moving card to column ${column_id}`);
    await this.action.rest.projects.moveCard({
      card_id: parseInt(card.id),
      position: 'bottom',
      column_id,
    });
  }
}

export class ProjectContentV2 extends ProjectContent {
  protected readonly number: number;
  protected readonly id: string;
  protected readonly columnFieldId: string;

  protected constructor(action: OctokitAction, columns: ProjectColumn[], number: number, id: string, columnFieldId: string) {
    super(action, columns);
    this.number = number;
    this.id = id;
    this.columnFieldId = columnFieldId;
  }

  public static async fromProject(
    action: OctokitAction,
    number: number,
  ): Promise<ProjectContent> {
    const {
      organization: {
        projectV2: {
          id,
          field: { options: columns, id: columnFieldId }
        }
      }
    }: GraphQlQueryResponseData = await action.sendGraphQL(`
        query {
          organization(login: "${action.repo.owner}") {
              projectV2 (number: ${number}) {
                  id
                  field (name: "Status"){
                      ... on ProjectV2SingleSelectField {
                          id
                          options { 
                            id 
                            name 
                          }
                      }
                  }
              }
          }
      }`);
    return new ProjectContentV2(action, columns, number, id, columnFieldId); // Only "id" and "name" are filled. We can query more if we need to
  }

  public async findCard(issueOrPR: IssueOrPR): Promise<Card> {
    // FIXME: Pagination - replace "first:100" with paging. There will be more than 100 issues
    console.log("FIXME pagination");
    const {
      organization: {
        projectV2: {
          items
        }
      }
    }: GraphQlQueryResponseData = await this.action.sendGraphQL(`
        query {
          organization(login: "${this.action.repo.owner}") {
              projectV2 (number: ${this.number}) {
                items (first:100){
                    totalCount
                    nodes {
                        id
                        fieldValueByName (name:"Status")
                        {
                            ... on ProjectV2ItemFieldSingleSelectValue { name }
                        }
                        content
                        {
                            ... on Issue { number }
                            ... on PullRequest { number }
                        }
                    }
                }
              }
          }
      }`);
    for (const item of items.nodes) {
      if (item.content.number === issueOrPR.number) {
        return { id: item.id, columnName: item.fieldValueByName?.name };
      }
    }
    this.action.log(`Card not found for #${issueOrPR.number}`);
    return null;
  }

  public async moveCard(card: Card, column_id: number): Promise<void> {
    console.log(`Moving card to column ${column_id}`);
    await this.action.sendGraphQL(`
      mutation {
        updateProjectV2ItemFieldValue(input: {
          projectId: "${this.id}",
          itemId: "${card.id}",
          fieldId: "${this.columnFieldId}",
          value: {
            singleSelectOptionId: "${column_id}"
          }
        }) 
        {
          projectV2Item { id }
        }
      }`);
  }
}