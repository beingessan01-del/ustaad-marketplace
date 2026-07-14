const fs = require('fs');
const path = require('path');

function searchDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.git' && file !== '.next') {
        searchDir(fullPath);
      }
    } else {
      if (file.startsWith('.env')) {
        console.log(`Environment file found: ${fullPath}`);
        const content = fs.readFileSync(fullPath, 'utf8');
        console.log(content);
      }
    }
  }
}

searchDir('.');
