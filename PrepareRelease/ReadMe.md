# PrepareRelease

Locks the release branch and posts a Slack message pinging everyone who still has tickets to validate.

It looks up a Jira board by name, finds its tickets in a given status (`In Validation` by default), groups them by assignee, and posts a message that `@`-mentions each assignee with links to their tickets. The message is sent only on the run that actually locks the branch; if the branch is already locked, it does nothing.

Example message:

```
test-repo: The branch `master` was locked for release :ice_cube:
Tickets to validate:
- @user1
  • PROJ-1
  • PROJ-2
- @user2
  • PROJ-3
```

Tickets without an assignee are grouped under `Unassigned`. Each assignee is mentioned by resolving their Slack user from their Jira email; if there is no match, their display name is shown without a ping.

## Inputs

| Input | Required | Default | Description |
|-------|----------|---------|-------------|
| `github-token` | yes | | Token with `administration:write` (or `public_repo` from an admin) to lock the branch. |
| `jira-user` | yes | | Jira auth user. |
| `jira-token` | yes | | Jira auth token. |
| `board` | yes | | Jira board/team name; must match a name in `Data/TeamConfiguration.ts`. |
| `slack-token` | yes | | Slack token with `chat-write`, `chat-write.public`, and `users:read.email` scope. |
| `slack-channel` | yes | | Slack channel name or ID to notify. |
| `status` | no | `In Validation` | Jira ticket status to look for. |
| `branch-pattern` | no | `master` | Branch protection rule to lock. |

## Prerequisites

A branch protection rule for `branch-pattern` must already exist. If it is managed as IaC in `re-service-config`, set it to ignore `lock_branch` changes so Terraform does not override the lock.

## Example usage

```yaml
steps:
  - id: secrets
    uses: SonarSource/vault-action-wrapper@v3
    with:
      secrets: |
        development/github/token/{REPO_OWNER_NAME_DASH}-lock token | lock_token;
        development/kv/data/jira user | jira_user;
        development/kv/data/jira token | jira_token;
        development/kv/data/slack token | slack_api_token;
  - uses: sonarsource/gh-action-lt-backlog/PrepareRelease@v2
    with:
      github-token: ${{ fromJSON(steps.secrets.outputs.vault).lock_token }}
      jira-user: ${{ fromJSON(steps.secrets.outputs.vault).jira_user }}
      jira-token: ${{ fromJSON(steps.secrets.outputs.vault).jira_token }}
      slack-token: ${{ fromJSON(steps.secrets.outputs.vault).slack_api_token }}
      slack-channel: public-channel-name
      board: "CFamily Squad"
```
