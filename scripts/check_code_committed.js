const { execSync } = require('child_process');
const { simpleGit } = require('simple-git');

const [,,command] = process.argv;

if (!command) {
  throw new Error('Missing argument for script, please provide an action to perform.')
}

execSync(command, {stdio: 'inherit'});

(async () => {
  const status = await simpleGit().status();
  console.log('git status', status);
  if (!isEmpty(status)) {
    throw new Error(`There are uncommited file changes for script "${command}":\n${JSON.stringify(status, null, 2)}`);
  }
})();

function isEmpty(gitStatus) {
  return (
    gitStatus.not_added.length === 0 &&
    gitStatus.conflicted.length === 0 &&
    gitStatus.created.length === 0 &&
    gitStatus.deleted.length === 0 &&
    gitStatus.modified.length === 0
  );
}
