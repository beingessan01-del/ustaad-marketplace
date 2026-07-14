const fs = require('fs');
const content = fs.readFileSync('app/chat/page.tsx', 'utf8');

// Let's print all lines containing localStorage or window to inspect them
const lines = content.split('\n');
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('localStorage') || lines[i].includes('window')) {
    console.log(`Line ${i+1}: ${lines[i].trim()}`);
  }
}
