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

[CreateRspecIssue](CreateRspecIssue) - Create issue to update RSPEC after milestone is created.

[LogPayload](LogPayload) - Log payload to console

