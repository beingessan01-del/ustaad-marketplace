const fs = require('fs');
const content = fs.readFileSync('app/technician-dashboard/page.tsx', 'utf8');
const lines = content.split('\n');

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('job_offers') || lines[i].includes('offers') || lines[i].includes('subscribe')) {
    console.log(`Line ${i+1}: ${lines[i].trim()}`);
  }
}
