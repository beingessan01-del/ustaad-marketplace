const fs = require('fs');
const path = require('path');
const os = require('os');

const homeDir = os.homedir();
const filesToCheck = ['.bash_history', '.sh_history', '.zsh_history', '.history'];

for (const file of filesToCheck) {
  const fullPath = path.join(homeDir, file);
  if (fs.existsSync(fullPath)) {
    console.log(`Found history file: ${file}`);
    const content = fs.readFileSync(fullPath, 'utf8');
    const lines = content.split('\n');
    console.log(`Last 50 lines of ${file}:`);
    console.log(lines.slice(Math.max(0, lines.length - 50)).join('\n'));
  }
}
