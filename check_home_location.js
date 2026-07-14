const fs = require('fs');
const content = fs.readFileSync('app/home/page.tsx', 'utf8');
const lines = content.split('\n');

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('geolocation') || lines[i].includes('Position') || lines[i].includes('coords')) {
    console.log(`Line ${i+1}: ${lines[i].trim()}`);
  }
}
