# PullRequestCreated

Upon pull request creation, create a Jira ticket if no tickets are mentioned in the title.

This action will take the first non-`Sub-task` ticket and use it as a parent for the created ticket:
- if the parent is an `Epic`, the created ticket will be a `Task`
- if the parent is not an `Epic`, the created ticket will be a `Sub-task`
- if there is no parent, the created ticket will be a `Task`

When creating a new Jira issue, the action will add the new issue ID to the PR title.
The action will update the PR description with links to all mentioned Jira tickets for easy navigation.

Action uses `Commit` and `Start` transitions to update the issue and assigns it to the author. It also uses `Request Review` transition in case there's a reviewer already selected during the PR creation.

Action assigns a Team field based on the PR author's Team, or Project Lead for authors without Jira account (bots).

Action assigns a Sprint field based on the determined user Team and boardId from the [configuration](../Data/TeamConfiguration.ts).

This action does nothing if the PR title contains `DO NOT MERGE` phrase.

## Inputs

### `github-token`

Token to access the GitHub API. This is a special token from Vault, see below. The default `secrets.GITHUB_TOKEN` does not have enough permissions.

### `jira-user`

User to access the Jira API.

### `jira-token`

Token to access the Jira API.

### `jira-project`

Jira project key that is used to create new issues. If key is not specified, the action will not create tasks. It will only create a sub-task, if a parent issue is mentioned in the description.

### `additional-fields`

Additional fields to set when creating the Jira issue. 

```yaml
additional-fields: '{ "components": [ { "name": "Something" } ], "labels": ["Something"] }'
```

It overrides fields set by the action.

### `is-eng-xp-squad`

Set to `true` only for repositories owned by Engineering Experience Squad. Do not use it anywhere else.

This parameter changes project selection rules, adds implicit labels, components and does not modify the description.

When set, do not set `jira-project` nor `additional-fields` parameters.

## Outputs

None

## Prerequisites

Ask DevInfra Squad to "Add Jira GitHub tokens" to the Vault configuration of your repository. Example: [PREQ-92](https://sonarsource.atlassian.net/browse/PREQ-92)

## Troubleshooting

1. Issue creation fails

    > Field 'customfield_...' cannot be set. It is not on the appropriate screen, or unknown.

    Ask Jira Admin to update Issue creation screen for your project and Task issue type. It is missing Team or Sprint field.

1. Search for active sprint fails

    > The requested board cannot be viewed because it either does not exist or you do not have permission to view it.

    Go to the filter of your board and add "My organization" to the "Viewers" permission list.

1. Issue is assigned to a wrong Team

    Check your team membership in Jira and remove yourself from irrelevant teams.
    
    Teams present in the [configuration](../Data/TeamConfiguration.ts) are preferred in case user is member of multiple teams.
    
    Check if the Team name is specified correctly.
    
1. Issue is not assigned to a sprint

    Check the action log to see if it managed to identify Team, Board and Sprint. 
    
    Check if the [configuration](../Data/TeamConfiguration.ts) contains correct Team name and boardId.

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
    runs-on: ubuntu-latest-large
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
      - uses: sonarsource/gh-action-lt-backlog/PullRequestCreated@v2
        with:
          github-token: ${{ fromJSON(steps.secrets.outputs.vault).GITHUB_TOKEN }}
          jira-user:    ${{ fromJSON(steps.secrets.outputs.vault).JIRA_USER }}
          jira-token:   ${{ fromJSON(steps.secrets.outputs.vault).JIRA_TOKEN }}
          jira-project: EXAMPLE

```
