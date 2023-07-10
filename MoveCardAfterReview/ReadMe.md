# MoveCardAfterReview

Assign fixed issue or PR card to PR author and move the card to the `In Progress` or `Review approved` column.

If relevant card does not exist, a new one is created in the selected GitHub project column.

When PR contains one or more `Fixes #...` in the description, all referenced issues are moved. Otherwise, card for the standalone PR itself is moved.

## Inputs

### `github-token`

Token to access GitHub API.

### `column-id`

ID of the Kanban column where the card should be moved to. Typically ID of `In progress` or `Review approved` column. [This page](../docs/github.md) explains how this can be obtained.

## Outputs

None

## Example usage

```yaml
name: Submit Review

on:
  pull_request_review:
    types: ["submitted"]

jobs:
  MoveCardToProgress_job:
    name: Move card to progress
    runs-on: ubuntu-latest
    # Single quotes must be used here https://docs.github.com/en/free-pro-team@latest/actions/reference/context-and-expression-syntax-for-github-actions#literals
    # PRs from forks don't have required token authorization
    if: |
        github.event.pull_request.head.repo.full_name == github.repository
        && github.event.review.author_association != 'NONE'
        && github.event.review.state == 'changes_requested'
    steps:
      - uses: sonarsource/gh-action-lt-backlog/MoveCardAfterReview@v1
        with:
          github-token: ${{secrets.GITHUB_TOKEN}}
          column-id: 123456     # Kanban "In progress" column

  ReviewApproved_job:
    name: Move card to review approved
    runs-on: ubuntu-latest
    if: |
        github.event.pull_request.head.repo.full_name == github.repository
        && github.event.review.author_association != 'NONE'
        && github.event.review.state == 'approved'
    steps:
      - uses: sonarsource/gh-action-lt-backlog/MoveCardAfterReview@v1
        with:
          github-token: ${{secrets.GITHUB_TOKEN}}
          column-id: 123456     # Kanban "Review approved" column
```
