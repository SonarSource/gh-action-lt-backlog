# RequestReview

Move fixed issue or PR card to "Review in progress" column and assign it to the reviewer.

If relevant card does not exist, a new one is created in the selected GitHub project column.

When PR contains one or more `Fixes #...` in the description, all referenced issues are moved. Otherwise, card for the standalone PR itself is moved.

## Inputs

### `github-token`

Token to access GitHub API.

### `column-id`

ID of the Kanban column where the card should be moved to. Typically ID of `Review in progress` column.

## Outputs

None

## Example usage

```yaml
name: Request review

on:
  pull_request:
    types: ["review_requested"]

jobs:
  RequestReview_job:
    name: Request review
    runs-on: ubuntu-latest
    steps:
      - uses: sonarsource/gh-action-lt-backlog/RequestReview@v1
        with:
          github-token: ${{secrets.GITHUB_TOKEN}}
          column-id: 123456     # Kanban "Review in progress" column
```