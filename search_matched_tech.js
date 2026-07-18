const fs = require('fs');
const content = fs.readFileSync('app/booking/instant/page.tsx', 'utf8');
const lines = content.split('\n');

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('matchedTech')) {
    console.log(`Line ${i+1}: ${lines[i].trim()}`);
  }
}
