const fs = require('fs');
const content = fs.readFileSync('app/api/chat/route.ts', 'utf8');
const lines = content.split('\n');

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('price_estimate')) {
    console.log(`Line ${i+1}: ${lines[i].trim()}`);
  }
}
