# LockBranch

Set a branch protection rule to a specific lock state (`true` or `false`).

When `lock-branch` is set to `false`, auto-merge is canceled on all open PRs targeting the branch.

## Inputs

### `github-token`

Token to access the GitHub API.

The token needs `administration:write` permissions or `public_repo` scope from a user with admin rights to the repository.

### `lock-branch`

Target lock state of the branch protection rule. `true` locks the branch, `false` unlocks it.

### `slack-token`

Slack auth Token with `chat-write` and `chat-write.public` scope. This parameter is needed only when `slack-channel` is also specified.

This parameter is optional.

### `branch-pattern`

The pattern of the branch protection rule that should be locked or unlocked.

This parameter is optional.

Default value: `master`

### `slack-channel`

Slack channel name or ID to send the notification to. When set, requires `slack-token` to be set as well.

This parameter is optional.

### `additional-message`

Additional Slack message text to be added to the default message.

This parameter is optional.

## Outputs

None

## Prerequisites

Ask DevInfra squad to add a

- `github_lock` token to the Vault configuration of your repository. [Example](https://github.com/SonarSource/re-terraform-aws-vault/blob/8372a71d1dbb5d408f777eaaea1ead6d85c75299/orders/analysis-dotnet-squad.yaml#L185-L186)
- `development/kv/data/slack` token. [Example](https://github.com/SonarSource/re-terraform-aws-vault/blob/8372a71d1dbb5d408f777eaaea1ead6d85c75299/orders/analysis-dotnet-squad.yaml#L200)

A branch protection rule for the configured `branch-pattern` has to exist before running this action.

### IaC branch protection in re-service-config

When the branch protection is configured as IaC in `re-service-config`, the next Terraform deployment will randomly override the branch lock, rendering this action ineffective.

Update your IaC branch protection to ignore changes of `lock_branch`. [Example](https://github.com/SonarSource/re-service-config/blob/423de3a4be1f390f60d5e770ae273d278de29fa9/github_sonarsource/analysis-team/repo_analysis-dotnet-squad.tf#L1389-L1392)

## Example usage

```yaml
name: Lock branch

on:
  workflow_dispatch:
    inputs:
      lock-branch:
        description: 'Lock the branch?'
        required: true
        type: boolean
      additional-message:
        description: 'Additional Slack message text'
        required: false

jobs:
  LockBranch_job:
    name: Lock branch
    runs-on: sonar-xs
    permissions:
      id-token: write
    steps:
      - id: secrets
        uses: SonarSource/vault-action-wrapper@v3
        with:
          secrets: |
            development/github/token/{REPO_OWNER_NAME_DASH}-lock token | lock_token;
            development/kv/data/slack token | slack_api_token;
      - uses: sonarsource/gh-action-lt-backlog/LockBranch@v2
        with:
          github-token: ${{ fromJSON(steps.secrets.outputs.vault).lock_token }}
          lock-branch: ${{ inputs.lock-branch }}
          slack-token: ${{ fromJSON(steps.secrets.outputs.vault).slack_api_token }} # Optional, needed only when slack-channel is set
          additional-message: ${{ inputs.additional-message }} # Optional, useful only when slack-channel is set
          branch-pattern: 'master' # Optional
          slack-channel: public-channel-name # Optional
```
