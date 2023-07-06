# MoveCardToReview - v2

Move fixed issue or PR card to `Review in progress` column and assign it to the reviewer.

If relevant card does not exist, a new one is created in the selected GitHub project column.

When PR contains one or more `Fixes #...` in the description, all referenced issues are moved. Otherwise, card for the standalone PR itself is moved.

## Inputs

### `github-token`

Token to access GitHub API.

### `column-id`

ID of the Kanban column where the card should be moved to. Typically ID of `Review in progress` column. [This page](docs/github.md) explains how this can be obtained.

### `project-number`

Number of the project where the column is. [This page](docs/github.md) explains how this can be obtained.

### `is-org`

Optional parameter, set to `false` in case you wish to use this action in a repository that belongs to a user.

## Outputs

None

## Example usage

```yaml
name: Request review

on:
  pull_request:
    types: ["review_requested"]

jobs:
  MoveCardToReview_job:
    name: Move card to review
    runs-on: ubuntu-latest
    # PRs from forks don't have required token authorization
    if: |
        github.event.pull_request.head.repo.full_name == github.repository
        && github.event.review.author_association != 'NONE'
    steps:
      - uses: sonarsource/gh-action-lt-backlog/MoveCardToReview-v2@v1
        with:
          github-token: ${{secrets.GITHUB_TOKEN}}
          column-id: "9b76wgdbaw"     # Kanban "Review in progress" column
          project-number: 3
```
