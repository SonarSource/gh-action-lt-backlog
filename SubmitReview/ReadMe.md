# SubmitReview

Move fixed Jira tickets from one state to another using the `Request Changes` transitions.

## Inputs

### `github-token`

Token to access the GitHub API. 

### `jira-token`

Token to access the Jira API.

The token need the following [project permissions](https://confluence.atlassian.com/adminjiraserver/managing-project-permissions-938847145.html):
- `Browse projects`
- `Transition issues`

## Outputs

None

## Prerequisites

None

## Example usage

```yaml
name: Submit Review

on:
  pull_request_review:
    types: [submitted]

jobs:
  SubmitReview_job:
    name: Submit Review
    runs-on: ubuntu-latest
    steps:
      - id: secrets
        uses: SonarSource/vault-action-wrapper@v3
        with:
          secrets: |
            development/jira/token/{REPO_OWNER_NAME_DASH}-jira token | jira_token;
      - uses: sonarsource/gh-action-lt-backlog/SubmitReview@v2
        with:
          github-token: ${{secrets.GITHUB_TOKEN}}
          jira-token: ${{ fromJSON(steps.secrets.outputs.vault).jira_token }}
```
