const fs = require('fs');
const content = fs.readFileSync('app/technician-dashboard/page.tsx', 'utf8');
const lines = content.split('\n');

let foundSettings = false;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('settings') || lines[i].includes('Settings') || lines[i].includes('Specialty') || lines[i].includes('tab ===')) {
    if (lines[i].trim().length < 120) {
      console.log(`Line ${i+1}: ${lines[i].trim()}`);
    }
  }
}
