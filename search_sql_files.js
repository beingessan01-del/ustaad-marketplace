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
      if (file.endsWith('.sql')) {
        try {
          const content = fs.readFileSync(fullPath, 'utf8');
          if (content.toLowerCase().includes('create table public.bookings') || content.toLowerCase().includes('create table bookings')) {
            console.log(`Found bookings table creation definition in: ${fullPath}`);
          }
        } catch (e) {}
      }
    }
  }
}

searchDir('.');
