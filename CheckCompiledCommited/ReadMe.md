# CheckCompiledCommited

Checks that there is nothing to compile that hasn't been commited.

## Inputs

### `compile-command`

The command(s) to run at the root of the repository to compile the source files. Ex.: `npm run build`

## Outputs

None

## Example usage

```yaml
name: Check if compiled files were commited to git

on:
  push:

jobs:
  CheckCompiledCommited_job:
    name: Check if compiled is commited
    runs-on: ubuntu-latest

    steps:
      # it is required to checkout the git repository because CheckCompiledCommited depends on git
      - name: git checkout
        uses: actions/checkout@v3

      - uses: sonarsource/gh-action-lt-backlog/CheckCompiledCommited@v1
        with:
          compile-command: npm run build
```
