# PullRequestCreated

Upon pull request creation, create a Jira ticket if no tickets are mentioned in the title.

Depending on the content of the body, this action will create different types of Jira tickets:
- A `Task` with no parent if there is no ticket mentioned

## Inputs

### `github-token`

Token to access the GitHub API. 

### `jira-user`

User to access the Jira API.

### `jira-token`

Token to access the Jira API.

## Outputs

None

## Example usage

```yaml
name: Submit Review

on:
  pull_request_review:
    types: [submitted]

jobs:
  PullRequestCreated_job:
    name: Create pull request
    runs-on: ubuntu-latest
    steps:
      - id: secrets
        uses: SonarSource/vault-action-wrapper@v3
        with:
          secrets: |
            development/kv/data/jira user | JIRA_USER;
            development/kv/data/jira token | JIRA_TOKEN;
    - uses: sonarsource/gh-action-lt-backlog/PullRequestCreated@v2
        with:
          github-token: ${{secrets.GITHUB_TOKEN}}
          jira-project: NET
          jira-user: ${{ fromJSON(steps.secrets.outputs.vault).JIRA_USER }}
          jira-token: ${{ fromJSON(steps.secrets.outputs.vault).JIRA_TOKEN }}
```
