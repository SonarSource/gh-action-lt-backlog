# Actions to automate GitHub backlog and Kanban
Test
## Versioning

### `master`

Master contains current development work and should not be used by production templates.

Reviewed changes should be tested on `master` branch before their release to a versioned branch.

### `v1`, `v2`, ... `vn`

Versioned release branches. Always use the latest. Extensions are allowed; breaking changes requires creating a new version branch.

All actions should be consumed from these branches.

## Actions

[LogPayload](LogPayload) - Log payload to console

[PullRequestClosed](PullRequestClosed) - Move card after merging a pull request

[PullRequestCreated](PullRequestCreated) - Create Jira Issue for PR without issue reference

[RequestReview](RequestReview) - Move card when requesting review and assign it to the reviewer

[SubmitReview](SubmitReview) - Move card after submitting a review

[ToggleLockBranch](ToggleLockBranch) - Lock or Unlock branch to prevent merge of PRs.

## Development notes

### Setup Repox authentication token

1. Generate the `npm-repox-token` on repox.

2. Add the following line in `.npmrc` in your HOME folder:

    If `npm-repox-token` is base64 encoded:
    ```ini
    //repox.jfrog.io/artifactory/api/npm/npm/:_auth = <npm-repox-token>
    ```
    If not:
    ```ini
    //repox.jfrog.io/artifactory/api/npm/npm/:_authToken = <npm-repox-token>
    ```

    More info: https://docs.npmjs.com/cli/v9/configuring-npm/npmrc#auth-related-configuration

### /node_modules/ dependencies

The `/node_modules/` files that are part of the GIT repo:
* Must contain production dependencies for the actions to run.
* Must NOT contain development and testing dependencies, as those bring 10k+ small files that takes ages to check out on every action run.

Dependency update:

1. Delete `/node_module/`.
1. Comment out `/node_module/` exclusion in `.gitignore` file.
1. Run `npm install --omit=dev` to restore only production dependencies into the `/node_module/`.
1. Commit all changes.
1. Uncomment `/node_module/` exclusion in `.gitignore` file.
1. Run `npm install` to get all remaining files for local development.
1. Commit changes to `.package-lock.json` file.

### Run Octokit action from PowerShell:

This syntax allows setting environment variables with hyphens in the name:

```
${env:NODE_TLS_REJECT_UNAUTHORIZED}="0"
${env:GITHUB_REPOSITORY}="SonarSource/<YourRepoName>"
${env:INPUT_GITHUB-TOKEN}="ghp_...."
${env:INPUT_PARAM}="True"
${env:INPUT_PARAM-NAME-WITH-HYPHEN}="Value"
clear; node .\dist\ActionName\ActionName.js
```

`NODE_TLS_REJECT_UNAUTHORIZED` is unsafe and needed due to custom certificate in our network chain. It should be used only in short-lived console session.

### Local debugging

Create `.vscode/launch.json` file, update `program` path to `FIXME` startup file and start debugging:

```
{
  "version": "0.2.0",
  "configurations": [
    {
      "program": "${workspaceFolder}/dist/FIXME/FIXME.js",
      "type": "node",
      "request": "launch",
      "name": "Launch",
      "preLaunchTask": "tsc: build - tsconfig.json",
      "outFiles": [ "${workspaceFolder}/dist/**/*.js" ]
    }
  ]
}
```
