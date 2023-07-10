# CreateCardForStandalonePR

Create new card for a PR without fixed issue and assign it to the author.

## Compatibility

This action is compatible with GitHub's Projects classic and V2. V2 requires you to set the project number.

## Inputs

### `github-token`

Token to access GitHub API.

### `column-id`

ID of the Kanban column where the card should be moved to. Typically ID of `Review in progress` column. It is a number for Project classic and a string for V2. [This page](../docs/github.md) explains how this can be obtained.

### `project-number`

The project number. [This page](../docs/github.md) explains how this can be obtained.

## Outputs

None

## Usage examples

### Projects V2

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
          column-id: "3cab0eb0"     # Kanban "In progress" column
          project-number: 2
```

### Projects (classic)

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
          column-id: 123456         # Kanban "In progress" column
```
