# CleanupIssues

Cleanup stale Jira issues created by automation for PRs that were closed or merged on GitHub, but not in Jira.

The action searches the given Jira project for unresolved issues created by `Jira Tech User GitHub`. If the issue has all PRs closed or merged, it moves the Jira issue.

Issues with weblinks to another repositories are ignored. Issues without any weblinks are canceled.

## Inputs

### `github-token`

Token to access the GitHub API.

### `jira-user`

User to access the Jira API.

### `jira-token`

Token to access the Jira API.

### `jira-project`

Jira project key to clean up.

## Outputs

None

## Prerequisites

Ask Engineering Experience Squad to "Add Jira GitHub tokens" to the Vault configuration of your repository. Example: [PREQ-92](https://sonarsource.atlassian.net/browse/PREQ-92)

## Example usage

File name: `.github/workflows/CleanupIssues.yml`

```yaml
name: Cleanup Issues

on:
  schedule:
    - cron: "42 4 * * *"
  workflow_dispatch:

jobs:
  CleanupIssues_job:
    name: Cleanup Issues
    runs-on: sonar-xs
    permissions:
      id-token: write
      pull-requests: read
    steps:
      - id: secrets
        uses: SonarSource/vault-action-wrapper@v3
        with:
          secrets: |
            development/kv/data/jira user | JIRA_USER;
            development/kv/data/jira token | JIRA_TOKEN;
      - uses: sonarsource/gh-action-lt-backlog/CleanupIssues@v2
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          jira-user:    ${{ fromJSON(steps.secrets.outputs.vault).JIRA_USER }}
          jira-token:   ${{ fromJSON(steps.secrets.outputs.vault).JIRA_TOKEN }}
          jira-project: EXAMPLE

```
