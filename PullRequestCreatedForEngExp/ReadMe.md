# PullRequestCreatedForEngExp

Upon pull request creation, create a Jira ticket if no tickets are mentioned in the title.

This action is specific to Engineering Experience Squad. Do not use it anywhere else.

This action does nothing if the PR title contains `DO NOT MERGE` phrase.

## Inputs

### `github-token`

Token to access the GitHub API. This is a special token from Vault, see below. The default `secrets.GITHUB_TOKEN` does not have enough permissions.

### `jira-user`

User to access the Jira API.

### `jira-token`

Token to access the Jira API.

## Outputs

None

## Prerequisites

Ask DevInfra Squad to "Add Jira GitHub tokens" to the Vault configuration of your repository. Example: [EREQ-92](https://sonarsource.atlassian.net/browse/EREQ-92)

## Example usage

:warning: Use `runs-on: sonar-runner` in private repos.

```yaml
name: Pull Request Created

on:
  pull_request:
    types: ["opened"]

jobs:
  PullRequestCreated_job:
    name: Pull Request Created
    runs-on: ubuntu-latest
    permissions:
      id-token: write
    # For external PR, ticket should be created manually
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
      - uses: sonarsource/gh-action-lt-backlog/PullRequestCreatedForEngExp@v2
        with:
          github-token: ${{ fromJSON(steps.secrets.outputs.vault).GITHUB_TOKEN }}
          jira-user:    ${{ fromJSON(steps.secrets.outputs.vault).JIRA_USER }}
          jira-token:   ${{ fromJSON(steps.secrets.outputs.vault).JIRA_TOKEN }}

```
