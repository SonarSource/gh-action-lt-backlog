# CreateCardForIssueFromLabel

Crate card for issue in a project column determined by issue label. 

There should exist a backlog project with columns to organize issues into different categories. When an issue is labeled with a label in common format `<label-prefix> <column-name>`, card is created in `<column-name>` column of the project.

For example, the default `<label-prefix>` is `Type:`. Adding label `Type: False Positive` will create card in `False Positive` column of selected backlog project.

## Inputs

### `github-token`

Token to access GitHub API.

### `project-id`

ID of the Kanban project where the card should be created.

### `label-prefix`

Label prefix that activates this feature. Only labels with this prefix will create card. Project should contain column names without this prefix.

This parameter is optional. 

Default value: `Type:`

## Outputs

None

## Example usage

```yaml
name: Issue Labeled

on:
  issues:
    types: ["labeled"]

jobs:
  CreateCardForIssueFromLabel_job:
    name: Create card from label
    runs-on: ubuntu-latest
    # Single quotes must be used here https://docs.github.com/en/free-pro-team@latest/actions/reference/context-and-expression-syntax-for-github-actions#literals
    # Only limited global functions are available in this context https://docs.github.com/en/actions/reference/context-and-expression-syntax-for-github-actions#functions
    if: |
        github.event.issue.state == 'Open'
        && startsWith(github.event.label.name, 'Type: ')

    steps:
      - uses: sonarsource/gh-action-lt-backlog/CreateCardForIssueFromLabel@v1
        with:
          github-token: ${{secrets.GITHUB_TOKEN}}
          project-id: 123456        # Backlog project ID
          label-prefix: "Type:"     # Optional. Update startsWith condition above if you change it.
```
