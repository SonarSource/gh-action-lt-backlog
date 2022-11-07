# CreateCardForStandalonePR

Create new card for a PR without fixed issue and assign it to the author.

## Inputs

### `github-token`

Token to access GitHub API.

### `column-id`

ID of the Kanban column where the card should be created. Typically ID of `In Progress` column.

## Outputs

None

## Example usage

```yaml
name: Create card for standalone Pull Request

on:
  pull_request:
    types: ["opened"]

jobs:
  CreateCardForStandalonePR_job:
    name: Assign PR to the author and create a Kanban card
    runs-on: ubuntu-latest
    # Single quotes must be used here https://docs.github.com/en/free-pro-team@latest/actions/reference/context-and-expression-syntax-for-github-actions#literals
    # PRs from forks don't have required token authorization
    # Dependabot works directly under our repository, but doesn't have enough priviledges to create project card
    if: |
        github.event.pull_request.head.repo.full_name == github.repository
        && github.event.sender.type != 'Bot'
    steps:
      - uses: sonarsource/gh-action-lt-backlog/CreateCardForStandalonePR@v1
        with:
          github-token: ${{secrets.GITHUB_TOKEN}}
          column-id: 123456         # FIXME: Replace with "In Progress" column ID
```