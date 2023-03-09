const { execSync } = require('child_process');
const { simpleGit } = require('simple-git');

const [,,command] = process.argv;

if (!command) {
  throw new Error('Missing argument for script, please provide an action to perform.')
}

execSync(command);

(async () => {
  const status = await simpleGit().status();
  if (!isEmpty(status)) {
    throw new Error(`There are uncommited compiled files: ${JSON.stringify(status, null, 2)}`);
  }
})();

console.log('delete me');

function isEmpty(gitStatus) {
  return (
    gitStatus.not_added.length === 0 &&
    gitStatus.conflicted.length === 0 &&
    gitStatus.created.length === 0 &&
    gitStatus.deleted.length === 0
  );
}
