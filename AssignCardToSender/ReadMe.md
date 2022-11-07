# AssignCardToSender

Assign Kanban card to the sender of the event. This card should be called when card is moved from `To do` column on a Kanban board.

## Inputs

### `github-token`

Token to access GitHub API.

## Outputs

None

## Example usage

```yaml
name: Assign card to sender

on:
  project_card:
    types: ["moved"]

jobs:
  AssignCardToSender_job:
    runs-on: ubuntu-latest
    if: |
        github.event.changes.column_id.from == 1234567      # FIXME: Replace with "To do" column ID
        && github.event.project_card.content_url != null
    steps:
      - uses: sonarsource/gh-action-lt-backlog/AssignCardToSender@v1
        with:
          github-token: ${{secrets.GITHUB_TOKEN}}
```