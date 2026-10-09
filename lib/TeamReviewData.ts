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

import { JiraTeams, GitHubTeamSlugs, RootlyScheduleIds } from "../Data/TeamConfiguration.js";
import type { OctokitAction } from "./OctokitAction.js";
import { PullRequest, SimpleTeam } from "./OctokitTypes.js";
import { JiraTeam } from "./JiraTeam.js";
import { BOT_ASSIGNEE_ACCOUNT_IDS } from "./Constants.js";

type TeamCandidate = {
  createReviewTicket: boolean;
  jiraTeam: JiraTeam;
  rootlyScheduleId: string | null;
  ignoredGitHubTeamSlugs: string[];
};

export class TeamReviewData {
  public readonly createReviewTicket: boolean;
  public readonly senderAccountId: string | null;
  public readonly assigneeAccountId: string | null;
  public readonly jiraTeam: JiraTeam;
  public readonly gitHubTeam: SimpleTeam;

  protected constructor(createReviewTicket: boolean, senderAccountId: string | null, assigneeAccountId: string | null, team: JiraTeam, gitHubTeam: SimpleTeam) {
    this.createReviewTicket = createReviewTicket;
    this.senderAccountId = senderAccountId;
    this.assigneeAccountId = assigneeAccountId;
    this.jiraTeam = team;
    this.gitHubTeam = gitHubTeam;
  }

  public static async create(action: OctokitAction, pr: PullRequest, issueId: string, requested_team: SimpleTeam | null): Promise<TeamReviewData | null> {
    const candidate = await this.selectTeam(action, pr, issueId, requested_team);
    if (candidate && await this.senderIsFromOutsideTeam(action, candidate)) {
      const assigneeAccountId = await action.jira.findAccountId(await action.findRootlyOnCallEmails(candidate.rootlyScheduleId));
      return new TeamReviewData(candidate.createReviewTicket, await action.loadSenderAccountId(), assigneeAccountId, candidate.jiraTeam, requested_team!);
    } else {
      return null;
    }
  }

  private static async selectTeam(action: OctokitAction, pr: PullRequest, issueId: string, requested_team: SimpleTeam | undefined | null): Promise<TeamCandidate | null> {
    const createReviewTicket = !pr.isBot(); // Do not create 2nd Jira issue for bot PRs
    if (requested_team?.slug === GitHubTeamSlugs.PlatformCloudEngineering) {
      return {
        createReviewTicket,
        jiraTeam: JiraTeams.CloudEngineering,
        rootlyScheduleId: RootlyScheduleIds.PlatformCloudEngineeringTriager,
        ignoredGitHubTeamSlugs: [GitHubTeamSlugs.PlatformCloudEngineering, GitHubTeamSlugs.PlatformCloudProductionEngineering]
      };
    } else if (requested_team?.slug === GitHubTeamSlugs.PlatformCloudProductionEngineering) {
      return {
        createReviewTicket,
        jiraTeam: JiraTeams.CloudProductionEngineering,
        rootlyScheduleId: RootlyScheduleIds.PlatformCloudProductionEngineeringTriager,
        ignoredGitHubTeamSlugs: [GitHubTeamSlugs.PlatformCloudEngineering, GitHubTeamSlugs.PlatformCloudProductionEngineering]
      };
    } else if (requested_team?.slug === GitHubTeamSlugs.PlatformFrontEndEngineering) {
      return {
        createReviewTicket,
        jiraTeam: JiraTeams.FrontEndEngineering,
        rootlyScheduleId: RootlyScheduleIds.PlatformFrontEndEngineeringTriager,
        ignoredGitHubTeamSlugs: [GitHubTeamSlugs.PlatformFrontEndEngineering]
      };
    } else if (requested_team?.slug === GitHubTeamSlugs.PlatformEngXp) {
      const rootlyScheduleId = issueId.startsWith('PREQ-') && await this.canReplaceAssignee(action, issueId)
        ? RootlyScheduleIds.PlatformEngXpTriager  // Assign only PREQ when previously owned by bots
        : null;                                   // Do not assing BUILD tickets
      return {
        createReviewTicket: false,
        jiraTeam: JiraTeams.EngineeringExperience,
        rootlyScheduleId,
        ignoredGitHubTeamSlugs: []
      };
    } else {
      return null;
    }
  }

  private static async senderIsFromOutsideTeam(action: OctokitAction, candidate: TeamCandidate): Promise<boolean> {
    for (const slug of candidate.ignoredGitHubTeamSlugs) {
      const members = await action.listTeamMembers(slug);
      if (members.some(x => x.login === action.payload.sender?.login)) {
        return false;
      }
    }
    return true;
  }

  private static async canReplaceAssignee(action: OctokitAction, issueId: string): Promise<boolean> {
    const assignee = (await action.jira.loadIssue(issueId))?.fields.assignee;
    return !assignee || BOT_ASSIGNEE_ACCOUNT_IDS.includes(assignee.accountId);
  }
}
