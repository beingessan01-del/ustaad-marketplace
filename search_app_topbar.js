const fs = require('fs');
const content = fs.readFileSync('components/ustad/app-topbar.tsx', 'utf8');
const lines = content.split('\n');

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('location') || lines[i].includes('preset') || lines[i].includes('lat') || lines[i].includes('lng')) {
    console.log(`Line ${i+1}: ${lines[i].trim()}`);
  }
}
