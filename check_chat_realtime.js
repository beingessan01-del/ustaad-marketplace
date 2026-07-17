const fs = require('fs');
const content = fs.readFileSync('app/chat/[jobId]/page.tsx', 'utf8');
const lines = content.split('\n');

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('postgres_changes') || lines[i].includes('subscribe') || lines[i].includes('channel')) {
    console.log(`Line ${i+1}: ${lines[i].trim()}`);
  }
}
