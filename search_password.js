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
      if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js') || file.endsWith('.json') || file.endsWith('.toml') || file.endsWith('.txt')) {
        try {
          const content = fs.readFileSync(fullPath, 'utf8');
          if (content.includes('postgresql://') || content.includes('postgres://') || (content.includes('password') && (content.includes('db') || content.includes('supabase')))) {
            console.log(`Found possible DB connection/password in: ${fullPath}`);
          }
        } catch (e) {}
      }
    }
  }
}

searchDir('.');
