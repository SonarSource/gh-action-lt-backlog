# ImportIssue

Import sender issue into Jira and update issue title with the new Jira issue ID.

## Inputs

### `github-token`

Token to access the GitHub API.

### `jira-user`

User to access the Jira API.

### `jira-token`

Token to access the Jira API.

### `jira-project`

Jira project key that is used to create new issues.

## Outputs

None

## Prerequisites

Ask DevInfra Squad to "Add Jira GitHub tokens" to the Vault configuration of your repository. Example: [EREQ-92](https://sonarsource.atlassian.net/browse/EREQ-92)

## Example usage

```yaml
name: Issue labeled

on:
  issues:
    types: ["labeled"]

jobs:
  CreateJiraIssue_job:
    name: Create Jira issue
    runs-on: ubuntu-latest-large
    permissions:
      id-token: write
      issues: write
    steps:
      - id: secrets
        uses: SonarSource/vault-action-wrapper@v3
        with:
          secrets: |
            development/kv/data/jira user | JIRA_USER;
            development/kv/data/jira token | JIRA_TOKEN;
      - uses: sonarsource/gh-action-lt-backlog/ImportIssue@v2
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          jira-user:    ${{ fromJSON(steps.secrets.outputs.vault).JIRA_USER }}
          jira-token:   ${{ fromJSON(steps.secrets.outputs.vault).JIRA_TOKEN }}
          jira-project: EXAMPLE

```
