# CopyLabelToPR

Copy labels from all mentioned issues to PR. This action applies only to PRs that mention at least one issue, and do not fix any issue.

## Inputs

### `github-token`

Token to access GitHub API.

### `label-prefix`

Label prefix that should be copied. Empty value will copy all labels.

This parameter is optional. 

Default value: `Sprint:`

## Outputs

None

## Example usage

```yaml
name: Copy labels to PR

on:
  pull_request:
    types: ["opened"]

jobs:
  CopyLabelToPR_job:
    name: Copy labels to PR
    runs-on: ubuntu-latest
    # Single quotes must be used here https://docs.github.com/en/free-pro-team@latest/actions/reference/context-and-expression-syntax-for-github-actions#literals
    # PRs from forks don't have required token authorization
    # Dependabot works directly under our repository, but doesn't have enough priviledges to create project card
    if: |
        github.event.pull_request.head.repo.full_name == github.repository
        && github.event.sender.type != 'Bot'
    steps:
      - uses: sonarsource/gh-action-lt-backlog/CopyLabelToPR@v1
        with:
          github-token: ${{secrets.GITHUB_TOKEN}}
          label-prefix: 'Sprint:'         # Optional
```
