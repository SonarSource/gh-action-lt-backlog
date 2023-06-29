import * as core from '@actions/core';
import * as github from '@actions/github';
import { GitHub } from '@actions/github/lib/utils';
import { Action } from './Action';
import { RestEndpointMethods } from '@octokit/plugin-rest-endpoint-methods/dist-types/generated/method-types';
import { IssueOrPR } from './IssueOrPR';
import { Issue, ProjectCard, PullRequest } from './OctokitTypes';
import { ProjectContent } from './ProjectContent';

export abstract class OctokitAction extends Action {
  protected readonly octokit: InstanceType<typeof GitHub>;
  public readonly rest: RestEndpointMethods;

  constructor() {
    super();
    this.octokit = github.getOctokit(core.getInput('github-token'));
    this.rest = this.octokit.rest;
  }

  protected getInput(name: string): string {
    return core.getInput(name);
  }

  protected getInputNumber(name: string): number {
    const input = this.getInput(name);
    const value = parseInt(input);
    if (isNaN(value)) {
      throw new Error(`Value of input '${name}' is not a number: ${input}`);
    } else {
      return value;
    }
  }

  protected getInputBoolean(name: string): boolean {
    return this.getInput(name).toLowerCase() === 'true';
  }

  public async downloadData(url: string): Promise<any> {
    console.log('Downloading ' + url);
    return (await this.octokit.request(url)).data;
  }

  protected async getIssue(issue_number: number): Promise<Issue> {
    try {
      this.log(`Getting issue #${issue_number}`);
      return (await this.rest.issues.get(this.addRepo({ issue_number }))).data;
    } catch (error) {
      this.log(`Issue #${issue_number} not found: ${error}`);
      return null;
    }
  }

  protected async getPullRequest(pull_number: number): Promise<PullRequest> {
    try {
      this.log(`Getting PR #${pull_number}`);
      return (await this.rest.pulls.get(this.addRepo({ pull_number }))).data;
    } catch (error) {
      this.log(`Pull Request #${pull_number} not found: ${error}`);
      return null;
    }
  }

  protected async addAssignee(issue: { number: number }, login: string): Promise<void> {
    console.log('Assigning to: ' + login);
    await this.rest.issues.addAssignees(
      this.addRepo({
        issue_number: issue.number,
        assignees: [login],
      }),
    );
  }

  protected async removeAssignees(issue): Promise<void> {
    const oldAssignees = issue.assignees.map(x => x.login);
    if (oldAssignees.length !== 0) {
      console.log('Removing assignees: ' + oldAssignees.join(', '));
      await this.rest.issues.removeAssignees(
        this.addRepo({
          issue_number: issue.number,
          assignees: oldAssignees,
        }),
      );
    }
  }

  protected async reassignIssue(issue: { number: number }, login: string): Promise<void> {
    if (login.includes("[bot]")) {    // Avoid "dependabot[bot]"
      console.log(`Skipping reassignment to: ${login}`);
    }
    else {
      await this.removeAssignees(issue);
      await this.addAssignee(issue, login);
    }
  }

  protected async addLabels(issue: { number: number } , labels: string[]): Promise<void> {
    if (labels.length === 0) {
      console.log(`Skipping adding labels to #${issue.number}`)
    } else {
      console.log(`Adding ${labels.length} label(s) to #${issue.number}`)
      await this.rest.issues.addLabels(this.addRepo({
        issue_number: issue.number,
        labels
      }));
    }
  }

  protected fixedIssues(pr: { body?: string }): number[] {
    return this.mentionedIssuesCore(pr, "(?:close|closes|closed|fix|fixes|fixed|resolve|resolves|resolved)");
  }

  protected mentionedIssues(pr: { body?: string }): number[] {
    return this.mentionedIssuesCore(pr, "");
  }

  protected async createCard(issueOrPR: IssueOrPR, column_id: number): Promise<void> {
    if (column_id === 0) {
      this.log(`Skip creating card for #${issueOrPR.number}. column_id was not set.`);
    } else {
      const project = await ProjectContent.fromColumn(this, column_id);
      project.createCard(issueOrPR, column_id);
    }
  }

  protected async createNote(note: string, column_id: number): Promise<void> {
    if (column_id === 0) {
      this.log("Skip creating card for note. column_id was not set.");
    } else {
      this.log(`Creating note in column ${column_id}`);
      await this.rest.projects.createCard({ column_id, note });
    }
  }

  /**
   * This method will extract mentioned issue IDs (that are automatically translated into issue links in GitHub UI) from a PR body. The text like
   * ```
   * Fixes #42 because https://github.com/SonarSource/this-repo/issues/41 broke the logic that [link](https://github.com/SonarSource/this-repo/issues/40) added.
   * ```
   * Supported formats:
   * regexPrefix #42
   * regexPrefix https://github.com/SonarSource/this-repo/issues/42
   * regexPrefix [text](https://github.com/SonarSource/this-repo/issues/42)
   * 
   * Full link URLs must point to the current repo. GitHub issues from other repositories will not be returned.
   * 
   * @param regexPrefix Regular expression that should be prefixed before the actual issue mention.
   * @returns Array of mentioned issue numbers. The example above would return 42, 41, 40.
   */
  protected mentionedIssuesCore(pr: { body?: string }, regexPrefix: string): number[] {
    const url = this.escapeRegex(`https://github.com/${this.repo.owner}/${this.repo.repo}/issues/`);
    const capturingId = "(\\d+)";
    const issueId = "#" + capturingId;
    const issueUrl = url + capturingId;
    const issueLink = `\\[[^\\]]+\\]\\(${url}${capturingId}\\)`;
    const pattern = `${regexPrefix}\\s*(?:${issueId}|${issueUrl}|${issueLink})`
    const regex = new RegExp(pattern, "gi");
    let result = [];
    let match;
    while (match = regex.exec(pr.body)) {
      result = result.concat(match.map(x => parseInt(x)).filter(x => !isNaN(x)));
    }
    return result;
  }

  private escapeRegex(string): string {
    return string.replace(/[/\-\\^$*+?.()|[\]{}]/g, '\\$&');
  }
}
