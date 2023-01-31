# Actions to automate GitHub backlog and Kanban

## Versioning

### `master`

Master contains current development work and should not be used by production templates.

Reviewed changes should be tested on `master` branch before their release to a versioned branche.

### `v1`, `v2`, ... `vn`

Versioned release branches. Always use latest. Extensions are allowed, breaking changes requires creation of a new version branch.

All actions should be consumed from these branches.

## Actions

[AssignCardToSender](AssignCardToSender) - Assign Kanban card to sender of the event, mainly when moving card from `To do` column.

[CreateCardForIssue](CreateCardForIssue) - Create card for issue, mainly when milestoned.

[CreateCardForIssueFromLabel](CreateCardForIssueFromLabel) - Create card for issue in a project column determined by the issue label. Mainly to organize backlog project.

[CreateCardForStandalonePR](CreateCardForStandalonePR) - Create card for Standalone PR in `In progress` column.

[CreateRspecIssue](CreateRspecIssue) - Create issue to update RSPEC after milestone is created.

[ToggleLockBranch](ToggleLockBranch) - Lock or Unlock branch to prevent merge of PRs.

[LogPayload](LogPayload) - Log payload to console

[MoveCardAfterReview](MoveCardAfterReview) - Move card back to `In Progress` or to `Review approved` column after review.

[MoveCardToReview](MoveCardToReview) - Move card to `Review in progress` when PR author asks for a review.

## Development notes

### Run Octokit action from PowerShell:

This syntax allows setting environment variables with hyphens in the name:

```
${env:GITHUB_REPOSITORY}="SonarSource/<YourRepoName>"
${env:INPUT_GITHUB-TOKEN}="ghp_...."
${env:INPUT_PARAM}="True"
${env:INPUT_PARAM-NAME-WITH-HYPHEN}="Value"
clear; node .\ActionName\ActionName.js
```

