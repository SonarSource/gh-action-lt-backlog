# CreateCardForIssue

Create a card for an issue in the configured column. Typically used to add an issue on Kanban when it's milestoned.

## Inputs

### `github-token`

Token to access GitHub API.

### `column-id`

ID of the Kanban column where the card should be created. Typically ID of `To do` column.

## Outputs

None

## Example usage

Create card on Kanban when an issue is milestoned.

```yaml
name: Milestone Issue

on:
  issues:
    types: ["milestoned"]

jobs:
  CreateCardForMilestonedIssue_job:
    name: Create card
    runs-on: ubuntu-latest
    # Single quotes must be used here https://docs.github.com/en/free-pro-team@latest/actions/reference/context-and-expression-syntax-for-github-actions#literals
    if: github.event.issue.state != 'closed'

    steps:
      - uses: sonarsource/gh-action-lt-backlog/CreateCardForIssue@v1
        with:
          github-token: ${{secrets.GITHUB_TOKEN}}
          column-id: 123456     # Kanban "To do" column
```

Create card on Kanban when a specific label is added to an issue.

```yaml
name: Issue Labeled

on:
  issues:
    types: ["labeled"]

jobs:
  CreateCardForLabeledIssue_job:
    name: Create card for labeled issue
    runs-on: ubuntu-latest
    # Single quotes must be used here https://docs.github.com/en/free-pro-team@latest/actions/reference/context-and-expression-syntax-for-github-actions#literals
    # Only limited global functions are available in this context https://docs.github.com/en/actions/reference/context-and-expression-syntax-for-github-actions#functions
    if: |
        github.event.issue.state != 'closed'
        && startsWith(github.event.label.name, 'Sprint:')

    steps:
      - uses: sonarsource/gh-action-lt-backlog/CreateCardForIssue@v1
        with:
          github-token: ${{secrets.GITHUB_TOKEN}}
          column-id: 123456     # Kanban "To do" column
```
