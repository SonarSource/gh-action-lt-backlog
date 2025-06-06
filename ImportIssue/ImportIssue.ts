import { GraphQlQueryResponseData } from '@octokit/graphql';
import { AtlassianDocument } from '../lib/AtlassianDocumentFormat';
import { JIRA_DOMAIN } from '../lib/Constants';
import { NewIssueParameters } from '../lib/NewIssueParameters';
import { OctokitAction } from '../lib/OctokitAction';
import { Issue } from '../lib/OctokitTypes';

class ImportIssue extends OctokitAction {
  protected async execute(): Promise<void> {
    const jiraProject = this.getInput('jira-project');
    const log: string[] = [];
    let cnt = 0;
    let hasNextPage = true;
    let endCursor = "";
    while (hasNextPage) {

      const {
        organization: {
          projectV2: {
            items: {
              pageInfo,
              nodes,
            },
          }
        },
      }: GraphQlQueryResponseData = await this.sendGraphQL(`
          query {
            organization(login: "SonarSource") {
              projectV2 (number: 10) {
                items (first: 100, after: "${endCursor}") {
                  pageInfo {
                    hasNextPage
                    endCursor
                  }
                  nodes {
                    id
                    fieldValueByName (name:"Effort")
                    {
                      ... on ProjectV2ItemFieldSingleSelectValue { name }
                    }
                    content
                    {
                      ... on Issue { number, title }
                    }
                  }
                }
              }
            }
          }`);

      for (const node of nodes) {
        if (node.fieldValueByName && node.fieldValueByName.name != 'Medium' && node.content.title.startsWith('NET-')) {
          const id = node.content.title.substring(0, 8);

          this.log('https://sonarsource.atlassian.net/browse/' + id + ' ' + node.fieldValueByName.name);
          const request = {
            body: AtlassianDocument.fromMarkdown(`Estimate from old GitHub project: ${node.fieldValueByName.name}`)
          }
          await this.jira.sendRestPostApi(`issue/${id}/comment`, request);


          //  if (node.fieldValueByName.name === "High") {
          //    const request = {
          //      fields: {
          //        priority: { name: "Major" }
          //      }
          //    };
          //    await this.jira.sendRestPutApi(`issue/${id}?notifyUsers=false`, request);
          //  } else if (node.fieldValueByName.name === "Low") {
          //    const request = {
          //      fields: {
          //        priority: { name: "Minor" }
          //      }
          //    };
          //    await this.jira.sendRestPutApi(`issue/${id}?notifyUsers=false`, request);
          //  }

        }
        cnt++;
      }
      hasNextPage = pageInfo.hasNextPage;
      endCursor = pageInfo.endCursor;
      this.log(`${hasNextPage}, ${endCursor}`);
    }

    this.log(cnt.toString());
    return;




    let page = 1;
    let issues: Issue[];
    do {
      issues = (await this.rest.issues.listForRepo(this.addRepo({ state: 'open', per_page: 100, page }))).data;
      for (const issue of issues) {
        if (issue.pull_request) {
          this.log(`#${issue.number} is a PR => SKIP`);
        } else if (issue && !issue.title.startsWith(`${jiraProject}-`)) {
          const id = await this.importIssue(jiraProject, issue);

          if (this.issueType(issue) == 'Task' || this.issueType(issue) === 'Improvement') {
            await this.addComment(issue.number, `Moved to [${id}](${JIRA_DOMAIN}/browse/${id})`);
            await this.rest.issues.update(this.addRepo({ issue_number: issue.number, state: 'closed' }));
          } else {
            await this.addComment(issue.number, `Internal ticket [${id}](${JIRA_DOMAIN}/browse/${id})`);
          }

          this.log(`https://github.com/${this.repo.owner}/${this.repo.repo}/issues/${issue.number}`);
          log.push(`https://github.com/${this.repo.owner}/${this.repo.repo}/issues/${issue.number}`);
          this.log(`${JIRA_DOMAIN}/browse/${id}`);
          log.push(`${JIRA_DOMAIN}/browse/${id}`);

        } else if (issue) {

          // FIXME: Find priority
          // FIXME: Dump priority
          // FIXME: If not the default, update in Jira




          //if (issue.user.login.endsWith('-sonarsource') && issue.labels.find(x => this.hasLabel(issue, "Type: False Negative"))) {
          //  await this.addComment(issue.number, `Moved`);
          //  await this.rest.issues.update(this.addRepo({ issue_number: issue.number, state: 'closed' }));
          //  this.log(`https://github.com/${this.repo.owner}/${this.repo.repo}/issues/${issue.number}`);
          //} else if (issue.labels.find(x => this.hasLabel(issue, "Type: False Negative"))) {
          //  log.push(issue.user.login);
          //} else {
          //  this.log(`Skip already imported: ${issue.title}`);
          //}
        }
      }
      page++;
    } while (issues.length === 100);

    this.log(`--- ${log.length / 2}x ---`);
    for (const line of log) {
      this.log(line);
    }

  }

  private async importIssue(jiraProject: string, issue: Issue): Promise<string> {
    console.log(`Importing ${issue.html_url}`);
    const parameters: NewIssueParameters = {
      issuetype: { name: this.issueType(issue) },
      description: AtlassianDocument.fromMarkdown(issue.body ?? ''),
    };
    const id = await this.jira.createIssue(jiraProject, issue.title, parameters);
    console.log(`Created ${id}`);
    const promises: Promise<void>[] = [];
    promises.push(this.jira.addIssueRemoteLink(id, issue.html_url));
    for (const component of issue.labels.map(x => typeof x === 'string' ? x : x.name).filter(x => x.startsWith('Type: ')).map(x => x.substring(6))) {
      promises.push(this.addJiraComponent(id, component));
    }
    promises.push(this.updateIssueTitle(issue.number, `${id} ${issue.title}`));
    await Promise.all(promises);
    return id;
  }

  private issueType(issue: Issue): string {
    const data: { name, type }[] = [
      { name: 'Type: Bug', type: 'Bug' },
      { name: 'Type: CFG/SE FPs', type: 'False Positive' },
      { name: 'Type: Code Fix', type: 'Improvement' },
      { name: 'Type: Coverage', type: 'Improvement' },
      { name: 'Type: False Negative', type: 'False Negative' },
      { name: 'Type: False Positive', type: 'False Positive' },
      { name: 'Type: Messages', type: 'Improvement' },
      { name: 'Type: New Rule', type: 'New Feature' },
      { name: 'Type: Performance', type: 'Improvement' },
      { name: 'Type: RSPEC', type: 'Improvement' },
      { name: 'Type: Rule Idea', type: 'New Feature' },
      { name: 'Type: Rule rework', type: 'Improvement' },
      { name: 'Type: SE', type: 'Improvement' },
      { name: 'Type: Utility', type: 'Improvement' },
      { name: 'Type: UX', type: 'Improvement' },
      { name: 'Type: Web', type: 'Improvement' },
    ];
    return data.find(x => this.hasLabel(issue, x.name))?.type ?? "Task";
  }

  private hasLabel(issue: Issue, label: string): boolean {
    return issue.labels.some(x => typeof x === 'object' && x.name === label);
  }
}

const action = new ImportIssue();
action.run();

