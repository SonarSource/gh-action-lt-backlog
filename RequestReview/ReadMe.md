# RequestReview

Move fixed Jira tickets using the 'Request Review' transition and assign them to the reviewer when requestiong a review on a pull request.

This action would typically move a ticket from `IN PROGRESS` to `IN REVIEW`. It will attempt to move all tickets mentionned in the pull request title.

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

Send email to REs - ask to add a `operations/team/re/kv/data/github/github-jira-integration` token to the Vault configuration of your repository - for each repository where you need to use this. [Example](https://github.com/SonarSource/re-terraform-aws-vault/pull/1200/files)

Note: The current token name is a temporary solution and will be changed in the future.

## Usage examples

```yaml
name: Request review

on:
  pull_request:
    types: ["review_requested"]

jobs:
  RequestReview_job:
    name: Request review
    runs-on: ubuntu-latest
    # For external PR, ticket should be moved manually
    if: |
        github.event.pull_request.head.repo.full_name == github.repository
    permissions:
      id-token: write
    steps:
      - id: secrets
        uses: SonarSource/vault-action-wrapper@v3
        with:
          secrets: |
            operations/team/re/kv/data/github/github-jira-integration token | GITHUB_TOKEN;
            development/kv/data/jira user | JIRA_USER;
            development/kv/data/jira token | JIRA_TOKEN;
      - uses: sonarsource/gh-action-lt-backlog/RequestReview@v2
        with:
          github-token: ${{ fromJSON(steps.secrets.outputs.vault).GITHUB_TOKEN }}
          jira-user:    ${{ fromJSON(steps.secrets.outputs.vault).JIRA_USER }}
          jira-token:   ${{ fromJSON(steps.secrets.outputs.vault).JIRA_TOKEN }}
```
