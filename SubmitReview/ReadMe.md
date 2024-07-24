# SubmitReview

Move fixed Jira tickets from one state to another using the `Request Changes` transitions.

This action will attempt to move all tickets mentionned in the pull request title.

## Inputs

### `github-token`

Token to access the GitHub API. 

### `jira-user`

User to access the Jira API.

### `jira-token`

Token to access the Jira API.

The token need the following [project permissions](https://confluence.atlassian.com/adminjiraserver/managing-project-permissions-938847145.html):
- `Browse projects`
- `Transition issues`

## Outputs

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
            development/kv/data/jira user | JIRA_USER;
            development/kv/data/jira password | JIRA_TOKEN;
    - uses: sonarsource/gh-action-lt-backlog/SubmitReview@v2
        with:
          github-token: ${{secrets.GITHUB_TOKEN}}
          jira-user: ${{ fromJSON(steps.secrets.outputs.vault).JIRA_USER }}
          jira-token: ${{ fromJSON(steps.secrets.outputs.vault).JIRA_TOKEN }}
```
