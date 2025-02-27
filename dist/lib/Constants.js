"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JIRA_ORGANIZATION_ID = exports.JIRA_SITE_ID = exports.JIRA_DOMAIN = exports.JIRA_ISSUE_PATTERN = void 0;
exports.JIRA_ISSUE_PATTERN = /[A-Z][A-Z0-9]*-\d+/g;
exports.JIRA_DOMAIN = 'https://sonarsource.atlassian.net';
// To find values for these constants, you can use the following query, update Jira domain, and post it here: https://developer.atlassian.com/platform/teams/graphql/explorer/
// To avoid consistency of having a single name for the same thing everywhere, wise developers of Patlassian* named the redundant `siteId` form teamSearchV2 a `cloudId` here.
// * https://en.wikipedia.org/wiki/Pat_%26_Mat#Names
// query MandatoryButUselessQueryName { tenantContexts ( hostNames: [ "sonarsource.atlassian.net" ] ) { cloudId orgId } }
exports.JIRA_SITE_ID = 'd2e970e4-8820-420f-8908-e27ca87a64b8';
exports.JIRA_ORGANIZATION_ID = '78eed3e4-84ad-4374-b777-a3b4ba5d9516';
//# sourceMappingURL=Constants.js.map