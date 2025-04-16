import { components } from '@octokit/openapi-types/types.d';

export type PullRequest = components['schemas']['pull-request'];
export type IssueComment = components["schemas"]["issue-comment"];

export function isRenovate(pr: PullRequest): boolean {
  return pr.user.login === "pavel-mikula-sonarsource";  // FIXME: REMOVE DEBUG, do not approve
  return pr.user.login === "renovate[bot]";
}