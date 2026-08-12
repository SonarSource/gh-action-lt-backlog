# AnnounceRelease

Locks the release branch and posts a Slack message that pings everyone who still has tickets to validate.

It locks the branch protection rule, finds the Jira project's tickets still in the `In Validation` state, groups them by assignee, and appends to the standard lock message an `@`-mention of each assignee with links to their tickets. The message is sent only on the run that actually locks the branch; if the branch is already locked, it does nothing.

Tickets without an assignee are grouped under `Unassigned`. Each assignee is mentioned by resolving their Slack user from their email; if there is no match, their display name is shown without a ping.

## Inputs

### `github-token`

Token to access the GitHub API.

The token needs `administration:write` permissions or `public_repo` scope from a user with admin rights to the repository.

### `jira-user`

Jira auth user.

### `jira-token`

Jira auth token.

### `slack-token`

Slack auth Token with `chat:write`, `chat:write.public`, and `users:read.email` scope.

### `slack-channel`

Slack channel name or ID to send the notification to.

### `project`

Jira project key (e.g. `NET`) whose tickets gate the release.

### `additional-message`

Additional Slack message text to be added to the default message.

This parameter is optional.

### `branch-pattern`

The pattern of the branch protection rule that should be locked.

This parameter is optional.

Default value: `master`

## Outputs

None

## Prerequisites

Ask DevInfra squad to add a
* `github_lock` token to the Vault configuration of your repository.
* `development/kv/data/jira` token.
* `development/kv/data/slack` token.

A branch protection rule for the configured `branch-pattern` has to exist before running this action.

### IaC branch protection in re-service-config

When the branch protection is configured as IaC in `re-service-config`, the next Terraform deployment will randomly override the branch lock, rendering this action ineffective.

Update your IaC branch protection to ignore changes of `lock_branch`.

## Example usage

```yaml
name: Announce release

on:
  workflow_dispatch:
    inputs:
      additional-message:
        description: 'Additional Slack message text'
        required: false

jobs:
  AnnounceRelease_job:
    name: Announce release
    runs-on: sonar-xs
    permissions:
      id-token: write
    steps:
      - id: secrets
        uses: SonarSource/vault-action-wrapper@v3
        with:
          secrets: |
            development/github/token/{REPO_OWNER_NAME_DASH}-lock token | lock_token;
            development/kv/data/jira user | jira_user;
            development/kv/data/jira token | jira_token;
            development/kv/data/slack token | slack_api_token;
      - uses: sonarsource/gh-action-lt-backlog/AnnounceRelease@v2
        with:
          github-token: ${{ fromJSON(steps.secrets.outputs.vault).lock_token }}
          jira-user: ${{ fromJSON(steps.secrets.outputs.vault).jira_user }}
          jira-token: ${{ fromJSON(steps.secrets.outputs.vault).jira_token }}
          slack-token: ${{ fromJSON(steps.secrets.outputs.vault).slack_api_token }}
          slack-channel: public-channel-name
          project: "NET"
          additional-message: ${{ inputs.additional-message }}  # Optional
          branch-pattern: "master"                              # Optional
```
