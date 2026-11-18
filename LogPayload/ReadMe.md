# LogPayload

Log JSON payload of any GitHub Action to console. Useful for development. 

## Inputs

None

## Outputs

None

## Example usage

File name: `.github/workflows/LogPayload.yml`, or preferably add this job to another existing action that you're trying to debug.

```yaml
name: Log Payload

on:     # Any trigger
  milestone:
    types: ["created"]

jobs:
  LogPayload_job:
    name: Log payload
    runs-on: sonar-xs
    steps:
      - uses: sonarsource/gh-action-lt-backlog/LogPayload@v2

```
