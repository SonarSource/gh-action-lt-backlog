# PullRequestClosed

Move fixed Jira tickets using the "Merge into branch", "Merge into master", or "Merge" transition after merging the pull request.

If the pull request has been merged to a release branch like `master`, `main`, or `branch-*`, the `Merge into master` transition will be used. It would typically move a ticket from `APPROVED` to `DONE`. For any other target branch, a `Merge into branch` transition will be used.

If `Merge into branch` or `Merge into master` transitions are not available, the action will attempt to use the `Merge` transition.

If the PR is closed without being merged, then the action will try to use `Cancel issue` transition for issues created by `Jira Tech User GitHub` via `PullRequestCreated` automation. It will not close any other issues.

This action will attempt to move all tickets mentioned in the pull request title.

## Inputs

### `github-token`

Token to access the GitHub API. 

### `jira-user`

User to access the Jira API.

### `jira-token`

Token to access the Jira API.

## Outputs

None

## Prerequisites

Ask DevInfra Squad to "Add Jira GitHub tokens" to the Vault configuration of your repository. Example: [EREQ-92](https://sonarsource.atlassian.net/browse/EREQ-92)

## Example usage

```yaml
name: Pull Request Closed

on:
  pull_request:
    types: [closed]

jobs:
  PullRequestClosed_job:
    name: Pull Request Closed
    runs-on: ubuntu-latest
    permissions:
      id-token: write
      pull-requests: read
    # For external PR, ticket should be moved manually
    if: |
        github.event.pull_request.head.repo.full_name == github.repository
    steps:
      - id: secrets
        uses: SonarSource/vault-action-wrapper@v3
        with:
          secrets: |
            development/kv/data/jira user | JIRA_USER;
            development/kv/data/jira token | JIRA_TOKEN;
      - uses: sonarsource/gh-action-lt-backlog/PullRequestClosed@v2
        with:
          github-token: ${{secrets.GITHUB_TOKEN}}
          jira-user:  ${{ fromJSON(steps.secrets.outputs.vault).JIRA_USER }}
          jira-token: ${{ fromJSON(steps.secrets.outputs.vault).JIRA_TOKEN }}

```
