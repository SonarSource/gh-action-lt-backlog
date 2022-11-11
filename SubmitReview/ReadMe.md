# SubmitReview

Assign fixed issue or PR card to PR author and move the card to the "In Progress" or "Review approved" columns, based on the review action.

If relevant card does not exist, a new one is created in the selected GitHub project column.

When PR contains one or more `Fixes #...` in the description, all referenced issues are moved. Otherwise, card for the standalone PR itself is moved.

## Inputs

### `github-token`

Token to access GitHub API.

### `request-changes-column-id`

ID of the Kanban column where the card should be moved to when changes are requested. Typically ID of `In progress` column.

### `approve-column-id`

ID of the Kanban column where the card should be moved to when PR is approved. Typically ID of `Review approved` column.

## Outputs

None

## Example usage

```yaml
name: Submit Review

on:
  pull_request_review:
    types: ["submitted"]

jobs:
  SubmitReview_job:
    name: Submit review
    runs-on: ubuntu-latest
    steps:
      - uses: sonarsource/gh-action-lt-backlog/SubmitReview@v1
        with:
          github-token: ${{secrets.GITHUB_TOKEN}}
          request-changes-column-id: 123456     # Kanban "In progress" column
          approve-column-id: 123456             # Kanban "Review approved" column
```