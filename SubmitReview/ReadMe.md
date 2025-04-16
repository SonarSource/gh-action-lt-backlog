# SubmitReview

Move fixed Jira tickets using the 'Request Changes' or 'Approved' transition after submitting a review on a pull request.

If the pull request has been approved, the `Approved` transition will be used. It would typically move a ticket from `IN REVIEW` to `APPROVED`.
If changes are requested, the `Request Changes` transition will be used. It would typically move a ticket from `IN REVIEW` to `IN PROGRESS`.

This action will attempt to move all tickets mentionned in the pull request title.

## Inputs

### `github-token`

Token to access the GitHub API. 

### `jira-user`

User to access the Jira API.

### `jira-token`

Token to access the Jira API.

### `is-eng-xp-squad`

Set to `true` only for repositories owned by Engineering Experience Squad. Do not use it anywhere else.

This parameter will not do any transition for approvals, and will fill `Reviewed by` field.

## Outputs

None

## Prerequisites

Ask Engineering Experience Squad to "Add Jira GitHub tokens" to the Vault configuration of your repository. Example: [EREQ-92](https://sonarsource.atlassian.net/browse/EREQ-92)

## Example usage

:warning: Use `runs-on: sonar-runner` in private repos.

```yaml
name: Submit Review

on:
  pull_request_review:
    types: [submitted]

jobs:
  SubmitReview_job:
    name: Submit Review
    runs-on: ubuntu-latest
    permissions:
      id-token: write
      pull-requests: read
    # For external PR, ticket should be moved manually
    if: |
        github.event.pull_request.head.repo.full_name == github.repository
        && (github.event.review.state == 'changes_requested' 
            || github.event.review.state == 'approved')
    steps:
      - id: secrets
        uses: SonarSource/vault-action-wrapper@v3
        with:
          secrets: |
            development/kv/data/jira user | JIRA_USER;
            development/kv/data/jira token | JIRA_TOKEN;
      - uses: sonarsource/gh-action-lt-backlog/SubmitReview@v2
        with:
          github-token: ${{secrets.GITHUB_TOKEN}}
          jira-user: ${{ fromJSON(steps.secrets.outputs.vault).JIRA_USER }}
          jira-token: ${{ fromJSON(steps.secrets.outputs.vault).JIRA_TOKEN }}

```
