const fs = require('fs');
const content = fs.readFileSync('app/technician-dashboard/page.tsx', 'utf8');
const lines = content.split('\n');

for (let i = 0; i < 110; i++) {
  if (lines[i].includes('const [') || lines[i].includes('useState')) {
    console.log(`Line ${i+1}: ${lines[i].trim()}`);
  }
}
