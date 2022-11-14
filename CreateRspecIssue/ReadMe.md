# CreateRspecIssue

Create issue to update RSPEC. This action should be triggered after milestone is created.

## Inputs

### `github-token`

Token to access GitHub API.

## Outputs

None

## Example usage

```yaml
name: Create RSPEC Issue

on:
  milestone:
    types: ["created"]

jobs:
  CreateRspecIssue_job:
    name: Create RSPEC Issue
    runs-on: ubuntu-latest
    steps:
      - uses: sonarsource/gh-action-lt-backlog/CreateRspecIssue@v1
        with:
          github-token: ${{secrets.GITHUB_TOKEN}}
          column-id: 123456         # Optional: Kanban "To do" column
```
