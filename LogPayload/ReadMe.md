# LogPayload

Log JSON payload of any GitHub Action to console. Useful for development. 

## Inputs

None

## Outputs

None

## Example usage

```yaml
name: Log Payload

on:     # Any trigger
  milestone:
    types: ["created"]

jobs:
  LogPayload_job:
    name: Log payload
    runs-on: ubuntu-latest
    steps:
      - uses: sonarsource/gh-action-lt-backlog/LogPayload@v1
```