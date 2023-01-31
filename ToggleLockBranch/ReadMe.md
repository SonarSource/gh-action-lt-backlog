# ToggleLockBranch

Modify branch protection rules to Lock or Unlock configured branch.

Locked branches cannot be modified, preventing pull request from being merged.

Intended usage is to prevent any changes on a repository that is about to be released. And development team needs to lock it temporarily.

## Inputs

### `github-token`

Token to access GitHub API.

### `branch-pattern`

Pattern of the branch protection rule that should be locked or unlocked.

This parameter is optional. 

Default value: `master`

## Outputs

None

## Example usage

```yaml
name: Toggle lock branch

on:
  workflow_dispatch:    # Triggered manually from GitHub UI / Actions

jobs:
  ToggleLockBranch_job:
    name: Toggle lock branch
    runs-on: ubuntu-latest
    steps:
      - uses: sonarsource/gh-action-lt-backlog/ToggleLockBranch@v1
        with:
          github-token: ${{secrets.GITHUB_TOKEN}}
          branch-name: "master"     # Optional
```
