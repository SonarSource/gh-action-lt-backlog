import { components } from '@octokit/openapi-types/types.d';

export type IssueComment = components["schemas"]["issue-comment"];
export type PullRequest = components['schemas']['pull-request'] & {
  // Declare extensions for the underlaying type. We can't modify the prototype, unfortunately. 
  isRenovate(): boolean;
  isDependabot(): boolean;
};

export function addPullRequestExtensions(pr: components['schemas']['pull-request']): PullRequest {  // Adds implementation of declared extensions
  return {
    ...pr,
    isRenovate: function (): boolean {
      return this.user.login === "renovate[bot]";
    },
    isDependabot: function (): boolean {
      return this.user.login === "dependabot[bot]";
    }
  };
}

