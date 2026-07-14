const fs = require('fs');
const path = require('path');

const dir = 'supabase/migrations/';
const files = fs.readdirSync(dir);
for (const file of files) {
  if (file.endsWith('.sql')) {
    const content = fs.readFileSync(path.join(dir, file), 'utf8');
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('create table') || lines[i].includes('CREATE TABLE')) {
        console.log(`${file} Line ${i+1}: ${lines[i]}`);
      }
    }
  }
}
