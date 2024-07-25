# PullRequestCreated

Upon pull request creation, create a Jira ticket if no tickets are mentioned in the title.

Depending on the content of the PR description, this action will create different types of Jira tickets:
- A `Task` with no parent
  - if there is no ticket mentioned in the description
  - or, there is no `Epic` mentioned when multiple tickets are mentioned in the description
- A `Task` with the mentioned `Epic` as a parent
- A `Task` with the first `Epic` mentioned as a parent if there are multiple tickets mentioned
- A `Sub-task` with the mentioned `Task` as a parent

## Inputs

### `github-token`

Token to access the GitHub API. 

### `jira-user`

User to access the Jira API.

### `jira-token`

Token to access the Jira API.

### `jira-project`

Jira project key that is used to create new issues.

## Outputs

None

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
          jira-user: ${{ fromJSON(steps.secrets.outputs.vault).JIRA_USER }}
          jira-token: ${{ fromJSON(steps.secrets.outputs.vault).JIRA_TOKEN }}
          jira-project: EXAMPLE
```
