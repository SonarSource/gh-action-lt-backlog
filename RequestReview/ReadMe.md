# RequestReview

Move fixed Jira tickets using the 'Request Review' transition and assign them to the reviewer when requesting a review on a pull request.

This action would typically move a ticket from `IN PROGRESS` to `IN REVIEW`. It will attempt to move all tickets mentioned in the pull request title.

## Inputs

### `github-token`

Token to access the GitHub API. This is a special token from Vault, see below. The default `secrets.GITHUB_TOKEN` does not have enough permissions.

### `jira-user`

User to access the Jira API.

### `jira-token`

Token to access the Jira API.

### `is-eng-xp-squad`

Set to `true` only for repositories owned by Engineering Experience Squad. Do not use it anywhere else.

This parameter will not change assignee, but will fill Reviewers field instead.

## Outputs

None

## Prerequisites

Ask Engineering Experience Squad to "Add Jira GitHub tokens" to the Vault configuration of your repository. Example: [PREQ-92](https://sonarsource.atlassian.net/browse/PREQ-92)

## Usage examples

:warning: Use `runs-on: sonar-runner` in private repos.

```yaml
name: Request review

on:
  pull_request:
    types: ["review_requested"]

jobs:
  RequestReview_job:
    name: Request review
    runs-on: ubuntu-latest-large
    permissions:
      id-token: write
    # For external PR, ticket should be moved manually
    if: |
        github.event.pull_request.head.repo.full_name == github.repository
    steps:
      - id: secrets
        uses: SonarSource/vault-action-wrapper@v3
        with:
          secrets: |
            development/github/token/{REPO_OWNER_NAME_DASH}-jira token | GITHUB_TOKEN;
            development/kv/data/jira user | JIRA_USER;
            development/kv/data/jira token | JIRA_TOKEN;
      - uses: sonarsource/gh-action-lt-backlog/RequestReview@v2
        with:
          github-token: ${{ fromJSON(steps.secrets.outputs.vault).GITHUB_TOKEN }}
          jira-user:    ${{ fromJSON(steps.secrets.outputs.vault).JIRA_USER }}
          jira-token:   ${{ fromJSON(steps.secrets.outputs.vault).JIRA_TOKEN }}

```
