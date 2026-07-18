const fs = require('fs');
const path = require('path');

function searchChat(dir) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      searchChat(fullPath);
    } else {
      if (file.endsWith('.ts') || file.endsWith('.tsx')) {
        const content = fs.readFileSync(fullPath, 'utf8');
        if (content.includes('price_estimate')) {
          console.log(`Found price_estimate in chat file: ${fullPath}`);
          // Print matching lines
          const lines = content.split('\n');
          for (let i = 0; i < lines.length; i++) {
            if (lines[i].includes('price_estimate')) {
              console.log(`  Line ${i+1}: ${lines[i].trim()}`);
            }
          }
        }
      }
    }
  }
}

searchChat('app/chat');
