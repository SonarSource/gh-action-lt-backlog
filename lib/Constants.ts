export const RENOVATE_PREFIX: string = 'Renovate Jira issue ID: ';  // Workaround for https://github.com/renovatebot/renovate/issues/26833
export const JIRA_ISSUE_PATTERN: RegExp = /[A-Z][A-Z0-9]*-\d+/g;
export const JIRA_DOMAIN = 'https://sonarsource-sandbox-608.atlassian.net'; // FIXME: Debug value on a Dev branch. This should NOT make it to a PR nor master

// To find values for these constants, you can use the following query, update Jira domain, and post it here: https://developer.atlassian.com/platform/teams/graphql/explorer/
// To avoid consistency of having a single name for the same thing everywhere, wise developers of Patlassian* named the redundant `siteId` form teamSearchV2 a `cloudId` here.
// * https://en.wikipedia.org/wiki/Pat_%26_Mat#Names
// query MandatoryButUselessQueryName { tenantContexts ( hostNames: [ "sonarsource.atlassian.net" ] ) { cloudId orgId } }
export const JIRA_SITE_ID = '5ea71b8c-f3d5-4b61-b038-001c50df1666'; // FIXME: Debug value on a Dev branch for sandbox. This should NOT make it to a PR nor master
export const JIRA_ORGANIZATION_ID = '78eed3e4-84ad-4374-b777-a3b4ba5d9516';
