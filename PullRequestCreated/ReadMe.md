# PullRequestCreated

Upon pull request creation, create a Jira ticket if no tickets are mentioned in the title.

This action will take the first non-`Sub-task` ticket and use it as a parent for the created ticket:
- if the parent is an `Epic`, the created ticket will be a `Task`
- if the parent is not an `Epic`, the created ticket will be a `Sub-task`
- if there is no parent, the created ticket will be a `Task`

When creating a new Jira issue, the action will add the new issue ID to the PR title.
The action will update the PR description with links to all mentioned Jira tickets for easy navigation.

## Inputs

### `github-token`

Token to access the GitHub API. This is a special token from Vault, see below. The default `secrets.GITHUB_TOKEN` does not have enough permissions.

### `jira-user`

User to access the Jira API.

### `jira-token`

Token to access the Jira API.

### `jira-project`

Jira project key that is used to create new issues.

### `additional-fields`

Additional fields to set when creating the Jira issue. 

```yaml
additional-fields: '{ "priority": { "name": "Major" }'
```

It overrides fields set by the action.

## Outputs

None

## Prerequisites

Send email to REs - ask to add a `operations/team/re/kv/data/github/github-jira-integration` token to the Vault configuration of your repository - for each repository where you need to use this. [Example](https://github.com/SonarSource/re-terraform-aws-vault/pull/1200/files)

Note: The current token name is a temporary solution and will be changed in the future.

## Example usage

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
            operations/team/re/kv/data/github/github-jira-integration token | GITHUB_TOKEN;
            development/kv/data/jira user | JIRA_USER;
            development/kv/data/jira token | JIRA_TOKEN;
      - uses: sonarsource/gh-action-lt-backlog/PullRequestCreated@v2
        with:
          github-token: ${{ fromJSON(steps.secrets.outputs.vault).GITHUB_TOKEN }}
          jira-user:    ${{ fromJSON(steps.secrets.outputs.vault).JIRA_USER }}
          jira-token:   ${{ fromJSON(steps.secrets.outputs.vault).JIRA_TOKEN }}
          jira-project: EXAMPLE

```
