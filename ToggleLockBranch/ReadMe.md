# ToggleLockBranch

Modify branch protection rules to Lock or Unlock configured branch.

Locked branches cannot be modified, preventing pull request from being merged.

The intended usage is to prevent any changes on a repository that is about to be released when the development team needs to lock it temporarily.

## Inputs

### `github-token`

Token to access the GitHub API. 

The token needs `administration:write` permissions or `public_repo` scope from a user with admin rights to the repository.

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

## Outputs

None

## Prerequisites

Ask DevInfra squad to add a 
* `github_lock` token to the Vault configuration of your repository. [Example](https://github.com/SonarSource/re-terraform-aws-vault/blob/8372a71d1dbb5d408f777eaaea1ead6d85c75299/orders/analysis-dotnet-squad.yaml#L185-L186)
* `development/kv/data/slack` token. [Example](https://github.com/SonarSource/re-terraform-aws-vault/blob/8372a71d1dbb5d408f777eaaea1ead6d85c75299/orders/analysis-dotnet-squad.yaml#L200)

A branch protection rule for the configured `branch-pattern` has to exist before running this action.

## Example usage

:warning: Use `runs-on: sonar-runner` in private repos.

```yaml
name: Toggle lock branch

on:
  workflow_dispatch:    # Triggered manually from the GitHub UI / Actions

jobs:
  ToggleLockBranch_job:
    name: Toggle lock branch
    runs-on: ubuntu-latest-large
    permissions:
      id-token: write
    steps:
      - id: secrets
        uses: SonarSource/vault-action-wrapper@v3
        with:
          secrets: |
            development/github/token/{REPO_OWNER_NAME_DASH}-lock token | lock_token;
            development/kv/data/slack token | slack_api_token;
      - uses: sonarsource/gh-action-lt-backlog/ToggleLockBranch@v2
        with:
          github-token: ${{ fromJSON(steps.secrets.outputs.vault).lock_token }}
          slack-token: ${{ fromJSON(steps.secrets.outputs.vault).slack_api_token }} # Optional, needed only when slack-channel is set
          branch-pattern: "master"              # Optional
          slack-channel: public-channel-name    # Optional

```
