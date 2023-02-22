# ToggleLockBranch

Modify branch protection rules to Lock or Unlock configured branch.

Locked branches cannot be modified, preventing pull request from being merged.

The intended usage is to prevent any changes on a repository that is about to be released when the development team needs to lock it temporarily.

## Inputs

### `github-token`

Token to access the GitHub API.

### `branch-pattern`

The pattern of the branch protection rule that should be locked or unlocked.

This parameter is optional. 

Default value: `master`

## Outputs

None

## Prerequisites

Send email to REs - ask to add a `github_lock` token to the Vault configuration of your repository - for each repository where you need to use this. [Example](https://github.com/SonarSource/re-terraform-aws-vault/blob/3f5efb03a94a38d1346cbde62631ce1a340b5e14/orders/bubble-dotnet.yaml#L180-L182)

## Example usage

```yaml
name: Toggle lock branch

on:
  workflow_dispatch:    # Triggered manually from the GitHub UI / Actions

jobs:
  ToggleLockBranch_job:
    name: Toggle lock branch
    runs-on: ubuntu-latest
    permissions:
      id-token: write
    steps:
      - id: secrets
        uses: SonarSource/vault-action-wrapper@2.4.3-1
        with:
          secrets: |
            development/github/token/{REPO_OWNER_NAME_DASH}-lock token | lock_token;
      - uses: sonarsource/gh-action-lt-backlog/ToggleLockBranch@v1
        with:
          github-token: ${{ fromJSON(steps.secrets.outputs.vault).lock_token }}
          branch-pattern: "master"     # Optional
```
