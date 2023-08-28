# CreateNote

Create a card with a note in the configured column.

## Inputs

### `github-token`

Token to access GitHub API.

### `column-id`

ID of the Kanban column where the card should be created. [This page](../docs/github.md) explains how this can be obtained.

### `note`

Text of the note.

## Outputs

None

## Example usage

```yaml
name: Closed Pull Request

on:
  # pull_request_target runs the fork code in our context. Do not use it elsewhere!
  # Here, it is OK because we're merging external PR and we're 100% sure about its content.
  pull_request_target:
    types: ["closed"]

jobs:
  CreateNote_job:
    name: Create release notes card
    runs-on: ubuntu-latest
    permissions:
      # Limit available permissions to a required minimum, because we run under pull_request_target
      repository-projects: write
    # Single quotes must be used here https://docs.github.com/en/free-pro-team@latest/actions/reference/context-and-expression-syntax-for-github-actions#literals
    if: |
        github.event.pull_request.head.repo.full_name != github.repository
        && github.event.pull_request.user.type != 'Bot'
        && github.event.pull_request.merged
    steps:
      - uses: sonarsource/gh-action-lt-backlog/CreateNote@v1
        with:
          github-token: ${{secrets.GITHUB_TOKEN}}
          column-id: 123456     # Kanban "To do" column
          note: ${{ format('Release notes{0} {1} implemented {2}{3}', ':', github.event.pull_request.user.login, '#',  github.event.pull_request.number) }}
```
