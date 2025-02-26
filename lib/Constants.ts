export const JIRA_ISSUE_PATTERN: RegExp = /[A-Z][A-Z0-9]*-\d+/g;
export const JIRA_DOMAIN = 'https://sonarsource.atlassian.net';

// To find values for these constants, you can use the following query, update Jira domain, and post it here: https://developer.atlassian.com/platform/teams/graphql/explorer/
// To avoid consistency of having a single name for the same thing everywhere, wise developers of Patlassian* named the redundant `siteId` form teamSearchV2 a `cloudId` here.
// * https://en.wikipedia.org/wiki/Pat_%26_Mat#Names
// query MandatoryButUselessQueryName { tenantContexts ( hostNames: [ "sonarsource.atlassian.net" ] ) { cloudId orgId } }
export const JIRA_SITE_ID = 'd2e970e4-8820-420f-8908-e27ca87a64b8';
export const JIRA_ORGANIZATION_ID = '78eed3e4-84ad-4374-b777-a3b4ba5d9516';
