# MoveCardToReview

Move fixed issue or PR card to `Review in progress` column and assign it to the reviewer.

If the relevant card does not exist, a new one is created in the selected GitHub project column.

When the PR contains one or more `Fixes #...` in the description, all the referenced issues are moved. Otherwise, card for the standalone PR itself is moved.

## Compatibility

This action is compatible with GitHub's Projects classic and V2. V2 requires you to set the `project-number` parameter.

## Inputs

### `github-token`

Token to access GitHub API.

### `column-id`

ID of the Kanban column where the card should be moved to. Typically ID of `Review in progress` column. It is a number for Project classic and a string for V2. [This page](../docs/github.md) explains how this can be obtained.

### `project-number`

The project number when Projects V2 is used. [This page](../docs/github.md) explains how this can be obtained.

## Outputs

None

## Prerequisites

Send an email to REs asking to add a `github_kanban` token to the Vault configuration of your repository for each repository where you need to use this.
A change like that [for the squad](https://github.com/SonarSource/re-terraform-aws-vault/blob/edba176cf3d89dd3a7e9ffed5807a8082076fbfe/orders/squad-jsts.yaml#L21-L29) and like that [for each repository](https://github.com/SonarSource/re-terraform-aws-vault/blob/edba176cf3d89dd3a7e9ffed5807a8082076fbfe/orders/squad-jsts.yaml#L77-L78).

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
    permissions:
      id-token: write
    # PRs from forks don't have required token authorization
    if: |
        github.event.pull_request.head.repo.full_name == github.repository
        && github.event.review.author_association != 'NONE'
    steps:
      - id: secrets
        uses: SonarSource/vault-action-wrapper@2.5.0-4
        with:
          secrets: |
            development/github/token/{REPO_OWNER_NAME_DASH}-kanban token | kanban_token;
      - uses: sonarsource/gh-action-lt-backlog/MoveCardToReview@v1
        with:
          github-token: ${{ fromJSON(steps.secrets.outputs.vault).kanban_token }}
          column-id: "abcdef00"     # Kanban "Review in progress" column
          project-number: 42
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
          column-id: 123456     # Kanban "Review in progress" column
```
