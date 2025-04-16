import { components } from '@octokit/openapi-types/types.d';

export type PullRequest = components['schemas']['pull-request'];

PullRequest.prototype.isRenovate = function (): boolean {
  return this.user?.login === 'renovate[bot]';
};
