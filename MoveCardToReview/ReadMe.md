# MoveCardToReview

Move fixed issue or PR card to `Review in progress` column and assign it to the reviewer.

If the relevant card does not exist, a new one is created in the selected GitHub project column.

When the PR contains one or more `Fixes #...` in the description, all the referenced issues are moved. Otherwise, card for the standalone PR itself is moved.

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
      - uses: sonarsource/gh-action-lt-backlog/MoveCardToReview@v1
        with:
          github-token: ${{secrets.GITHUB_TOKEN}}
          column-id: 123456     # Kanban "Review in progress" column
```

### Projects (classic)

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
      - uses: sonarsource/gh-action-lt-backlog/MoveCardToReview@v1
        with:
          github-token: ${{secrets.GITHUB_TOKEN}}
          column-id: "3cab0eb0"     # Kanban "Review in progress" column
          project-number: 2
```
