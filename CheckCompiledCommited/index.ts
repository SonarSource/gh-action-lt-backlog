import { Action } from '../lib/Action';
import * as core from '@actions/core';
import { execSync } from 'child_process';
import { simpleGit, StatusResult } from 'simple-git';

class CheckCompiledCommited extends Action {
  /**
   * 1. run compile command
   * 2. run git status
   * 3. throw error if there is something.
  */
  protected async execute(): Promise<void> {
    try {
      const buildCommand = core.getInput('build-command');
      if (buildCommand === undefined) {
        throw new Error('Missing "build-command" input.');
      }
      execSync(buildCommand);

      const status = await simpleGit().status();
      if (! isEmpty(status)) {
        throw new Error(`There are uncommited compiled files: ${JSON.stringify(status, null, 2)}`);
      }

    } catch (error) {
      core.setFailed(error.message);
    }
  }
}

const action = new CheckCompiledCommited();
action.run();

function isEmpty(gitStatus: StatusResult) {
  return gitStatus.not_added.length === 0 && gitStatus.conflicted.length === 0 && gitStatus.created.length === 0 && gitStatus.deleted.length === 0;
}
