# CreateCardForIssueFromLabel

Create a card for an issue in a project V2 column determined by the issue label. GitHub Project (classic) is not supported.

There should exist a backlog project with columns to organize issues into different categories. When an issue is labeled with a label in common format `<label-prefix> <column-name>`, card is created in `<column-name>` column of the project.

For example, the default `<label-prefix>` is `Type:`. Adding label `Type: False Positive` will create card in `False Positive` column of the configured backlog project.

## Inputs

### `github-token`

Token to access GitHub API.

### `project-number`

Number of the project V2 where the card should be created.

You can find the number in the project URL: `https://github.com/orgs/SonarSource/projects/<NUMBER>`.

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
    permissions:
      id-token: write
    # Single quotes must be used here https://docs.github.com/en/free-pro-team@latest/actions/reference/context-and-expression-syntax-for-github-actions#literals
    # Only limited global functions are available in this context https://docs.github.com/en/actions/reference/context-and-expression-syntax-for-github-actions#functions
    if: |
        github.event.issue.state == 'Open'
        && startsWith(github.event.label.name, 'Type:')

    steps:
      - id: secrets
        uses: SonarSource/vault-action-wrapper@v3
        with:
          secrets: |
            development/github/token/{REPO_OWNER_NAME_DASH}-kanban token | kanban_token;
      - uses: sonarsource/gh-action-lt-backlog/CreateCardForIssueFromLabel@v1
        with:
          github-token: ${{ fromJSON(steps.secrets.outputs.vault).kanban_token }}
          project-number: 42        # Backlog project ID
          label-prefix: "Type:"     # Optional. Update startsWith condition above if you change it.
```
