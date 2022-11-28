# LockBranch

Modify branch protection rules to Lock or Unlock configured branch.

Locked branches cannot be modified, preventing pull request from being merged.

Intended usage is to prevent any changes on a repository that is about to be released. And development team needs to lock it temporarily.

## Inputs

### `github-token`

Token to access GitHub API.

### `lock`

Boolean flag:

* `True` to lock a branch and prevent any changes on it.
* `False` to unlock a branch.

### `branch-name`

Name of the branch that should be locked or unlocked.

This parameter is optional. 

Default value: `master`

## Outputs

None

## Example usage

```yaml
name: Lock branch

on:
  workflow_dispatch:
    inputs:
      lock:
        description: 'Lock'
        required: true
        default: 'True'
        type: choice
        options:
        - True
        - False

jobs:
  LockBranch_job:
    name: Lock branch
    runs-on: ubuntu-latest
    steps:
      - uses: sonarsource/gh-action-lt-backlog/LockBranch@v1
        with:
          github-token: ${{secrets.GITHUB_TOKEN}}
          lock: ${{ inputs.lock }}
          branch-name: "master"     # Optional
```
