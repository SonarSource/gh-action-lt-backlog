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
import { JiraTeams } from "../Data/TeamConfiguration.js";
import { Config } from "./Configuration.js";
import { JIRA_ISSUE_PATTERN } from "./Constants.js";
import { AtlassianDocument } from "./AtlassianDocumentFormat.js";
const JIRA_DESCRIPTION_SAFE_ADF_LENGTH = 30_000;
const DESCRIPTION_TRUNCATION_NOTICE = 'Description truncated because it exceeds the Jira character limit. See the pull request for the full description.';
export class NewIssueData {
    projectKey;
    accountId;
    assigneeId;
    additionalFields;
    constructor(projectKey, accountId, assigneeId, additionalFields) {
        this.projectKey = projectKey;
        this.accountId = accountId;
        this.assigneeId = assigneeId;
        this.additionalFields = additionalFields;
    }
    static async create(jira, pr, inputJiraProject, inputAdditionalFields, accountId, fallbackTeam) {
        const parent = pr.isRenovate() || pr.isDependabot()
            ? null // Description contains release notes with irrelevant issue IDs
            : await this.findValidParent(jira, this.findMentionedIssues(pr));
        const projectKey = this.computeProjectKey(inputJiraProject, parent);
        if (projectKey) {
            const additionalFields = this.parseAdditionalFields(inputAdditionalFields);
            const parameters = this.newIssueParameters(projectKey, parent, additionalFields.issuetype?.name ?? 'Maintenance'); // Transfer issuetype name manually, because parameters should have priority due to Sub-task.
            parameters.description = this.parseDescription(pr.body);
            if (parameters.issuetype.name !== 'Sub-task') { // These fields cannot be set on Sub-task. Their values are inherited from the parent issue.
                const team = await this.findTeam(jira, accountId, projectKey, fallbackTeam); // Can be null for bots when project lead is not member of any team, and fallbackTeam is not set. Jira request will fail if the field is mandatory for the project.
                if (team != null) {
                    const sprintId = await this.findSprintId(jira, team.name);
                    parameters.customfield_10001 = team.id;
                    parameters.customfield_10020 = sprintId;
                }
                if (!parent) {
                    parameters.parent = await this.findEvergreenEpic(jira, team);
                }
            }
            return new NewIssueData(projectKey, accountId, accountId, { ...additionalFields, ...parameters });
        }
        else {
            console.log('No suitable project key found, issue will not be created');
            return null;
        }
    }
    static async createForEngExp(jira, pr, accountId) {
        const projectKey = await this.computeProjectKeyForEngExp(jira, pr, accountId);
        const parameters = this.newIssueParameters(projectKey, null, 'Maintenance');
        parameters.description = this.parseDescription(pr.body);
        if (accountId) {
            parameters.reporter = { id: accountId };
        }
        parameters.customfield_10001 = JiraTeams.EngineeringExperience.id;
        if (!pr.isRenovate() && projectKey !== "PREQ") {
            const sprintId = await this.findSprintId(jira, JiraTeams.EngineeringExperience.name);
            parameters.customfield_10020 = sprintId;
        }
        parameters.labels = pr.isRenovate()
            ? ['dvi-created-by-automation', 'dvi-renovate']
            : ['dvi-created-by-automation'];
        if (projectKey === 'BUILD') { // PREQ is handled by in-Jira automation, with hardcoded value
            parameters.parent = await this.findEvergreenEpic(jira, JiraTeams.EngineeringExperience);
        }
        return new NewIssueData(projectKey, accountId, projectKey === 'PREQ' ? null : accountId, parameters); // GHA-86 Leave PREQ unassigned
    }
    static async createForTeamReview(jira, teamReview) {
        const parameters = this.newIssueParameters('PREQ', null, 'Maintenance');
        if (teamReview.senderAccountId) {
            parameters.reporter = { id: teamReview.senderAccountId };
        }
        parameters.customfield_10001 = teamReview.jiraTeam.id;
        parameters.labels = ['preq-review-code'];
        parameters.parent = await this.findEvergreenEpic(jira, teamReview.jiraTeam, 'summary ~ "PREQ"');
        return new NewIssueData('PREQ', teamReview.senderAccountId, teamReview.assigneeAccountId, parameters);
    }
    static computeProjectKey(inputJiraProject, parent) {
        if (!parent) {
            return inputJiraProject; // Can be null => no new ticket. Like in rspec where we want to create child work items only when parent is set.
        }
        else if (parent.fields.issuetype.name === 'Epic') {
            // Parent Epic should prefer repo-project and use itself only as a fallback when repo is not set (like rspec).
            return inputJiraProject || parent.fields.project.key;
        }
        else {
            // This will create Sub-task that needs to follow the mentioned parent issue
            return parent.fields.project.key;
        }
    }
    static async computeProjectKeyForEngExp(jira, pr, accountId) {
        if (pr.base.repo.name === 'parent-oss') {
            return 'PARENTOSS';
        }
        else if (accountId) {
            const team = await jira.findTeamByUser(accountId);
            return team?.name === JiraTeams.EngineeringExperience.name ? 'BUILD' : 'PREQ';
        }
        else { // renovate and similar bots
            return 'BUILD';
        }
    }
    static parseAdditionalFields(inputAdditionFields) {
        if (inputAdditionFields) {
            try {
                return JSON.parse(inputAdditionFields);
            }
            catch (error) {
                console.log(`Unable to parse additional-fields: ${inputAdditionFields}`, error);
            }
        }
        return {};
    }
    static newIssueParameters(projectKey, parent, issueType) {
        switch (parent?.fields.issuetype.name) {
            case 'Epic':
                return { issuetype: { name: issueType }, parent: { key: parent.key } };
            case 'Sub-task':
            case undefined:
            case null:
                return { issuetype: { name: issueType } };
            default:
                return parent.fields.project.key === projectKey // Sub-task must be created in the same project
                    ? { issuetype: { name: 'Sub-task' }, parent: { key: parent.key } }
                    : { issuetype: { name: issueType } };
        }
    }
    static async findValidParent(jira, issues) {
        console.log('Looking for valid parent ticket');
        for (const issueKey of issues) {
            if (issueKey.startsWith("BUILD-") || issueKey.startsWith("PREQ-")) {
                console.log(`Ignoring Eng. Xp Squad project: ${issueKey}`);
            }
            else {
                const issue = await jira.loadIssue(issueKey);
                if (issue && !["Theme", "Initiative", "Sub-task"].includes(issue.fields.issuetype.name)) {
                    console.log(`Parent issue: ${issue.key} ${issue.fields.issuetype.name}`);
                    return issue;
                }
            }
        }
        console.log('No parent issue found');
        return null;
    }
    static findMentionedIssues(pr) {
        const mentionedIssues = pr.body?.match(JIRA_ISSUE_PATTERN) ?? [];
        console.log(mentionedIssues.length > 0 ? `Found mentioned issues: ${mentionedIssues}` : 'No mentioned issues found');
        return new Set(mentionedIssues);
    }
    static async findTeam(jira, userAccountId, projectKey, fallbackTeam) {
        if (userAccountId) {
            const team = await jira.findTeamByUser(userAccountId);
            if (team) {
                return team;
            }
        }
        if (fallbackTeam) {
            const team = await jira.findTeamByName(fallbackTeam);
            if (team) {
                return team;
            }
        }
        if (projectKey === 'SC') { // GHA-293: Lead of SC is in too many squads => issues lands in random board. Bot PRs should fallback to Cloud Engineering, anything else is configurable via 'fallback-team' parameter.
            return JiraTeams.CloudEngineering;
        }
        const project = await jira.loadProject(projectKey);
        console.log(`No team found for current user, using ${projectKey} lead ${project.lead.displayName}`);
        return jira.findTeamByUser(project.lead.accountId);
    }
    static async findSprintId(jira, teamName) {
        const team = Config.findTeam(teamName);
        if (team?.boardId) {
            return jira.findSprintId(team.boardId);
        }
        else {
            console.log(`No boardId is configured for team ${teamName}`);
            return null;
        }
    }
    static async findEvergreenEpic(jira, team, summary = 'summary ~ "KTLO" OR summary ~ "Evergreen"') {
        if (team) {
            const epics = await jira.findIssues(`issuetype = Epic AND statusCategory != Done AND (${summary}) and "Start date[Date]"<=startOfDay() and duedate>=startOfDay() and "Team[Team]"=${team.id} ORDER BY key`);
            if (epics.length === 0) {
                console.log(`Could not find Evergreen Epic parent for team ${team.name} with ID ${team.id} and Start/Due date in Jira`);
                return null;
            }
            else {
                console.log(`Found ${epics.length} Evergreen Epic(s), using ${epics[0].key} ${epics[0].fields.summary}`);
                return { key: epics[0].key };
            }
        }
        else {
            console.log('Team was not found, can not search for parent Evergreen Epic');
            return null;
        }
    }
    static parseDescription(body) {
        if (body && !/^Part of\s*<!--.*-->\s*$/s.test(body)) { // Don't spam Jira with default PR template
            let description = AtlassianDocument.fromMarkdown(body);
            let serializedLength = JSON.stringify(description).length;
            if (serializedLength <= JIRA_DESCRIPTION_SAFE_ADF_LENGTH) {
                return description;
            }
            console.log(`PR description has ${serializedLength} serialized ADF characters; it will be truncated to fit Jira's limit`);
            const suffix = `\n\n${DESCRIPTION_TRUNCATION_NOTICE}`;
            let input = body;
            while (serializedLength > JIRA_DESCRIPTION_SAFE_ADF_LENGTH && input.length > 0) {
                // Cap the first retry to quickly reduce very large descriptions; subsequent retries keep halving the input.
                input = input.substring(0, Math.min(20_000, Math.floor(input.length / 2)));
                description = AtlassianDocument.fromMarkdown(input + suffix);
                serializedLength = JSON.stringify(description).length;
            }
            if (serializedLength > JIRA_DESCRIPTION_SAFE_ADF_LENGTH) {
                throw new Error('Failed to truncate the Jira description: the ADF transformer produced an oversized document after the Markdown input was reduced to zero');
            }
            return description;
        }
        else {
            return undefined;
        }
    }
}
//# sourceMappingURL=NewIssueData.js.map