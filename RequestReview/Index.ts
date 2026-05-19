/*
 * Backlog Automation
 * Copyright (C) SonarSource Sàrl
 * mailto: info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 3 of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with this program; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
 */

// import { RequestReview } from "./RequestReview.js";

// const action = new RequestReview();
// action.run();


import { JIRA_DOMAIN, JIRA_ORGANIZATION_ID, JIRA_SITE_ID } from "../lib/Constants.js";
import { JiraClient } from "../lib/JiraClient.js";
import { NewIssueData } from "../lib/NewIssueData.js";
import { TeamReviewData } from "../lib/TeamReviewData.js";

console.log(`${JIRA_DOMAIN}, ${JIRA_SITE_ID}, ${JIRA_ORGANIZATION_ID}`);
console.log('No Parent & Eng Xp 2');
const jira = new JiraClient(JIRA_DOMAIN, JIRA_SITE_ID, JIRA_ORGANIZATION_ID, process.env['JIRA_USER'] || '', process.env['JIRA_TOKEN'] || '');
const teamReview = TeamReviewData.createFromAccount({ name: 'platform-cloud-eng-squad' } as any, '5dc3f7c6e3cc320c5e8a91f1');
if (teamReview) {

  (async () => {

    var myself = await jira.myself();
    console.log(JSON.stringify(myself, undefined, 2));

    const data = await NewIssueData.createForPreqReview(jira, teamReview);
    //data.additionalFields.customfield_10001 = undefined;
    //data.additionalFields.customfield_10001 = '3ca60b21-53c7-48e2-a2e2-6e85b39551d0';  // .NET
    data.additionalFields.customfield_10001 = 'eb40f25e-3596-4541-b661-cf83e7bc4fa6';  // Eng xp
    data.additionalFields.parent = undefined;
    //data.additionalFields.parent = { key: 'SC-46721' };
    data.additionalFields.labels = ["dvi-created-by-automation"];

    const issue = await jira.createIssue(data.projectKey, `Test - Ignore This`, data.additionalFields);
    console.log(`Done: ${issue}`);
  })();
}

