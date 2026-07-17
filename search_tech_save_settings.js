const fs = require('fs');
const content = fs.readFileSync('app/technician-dashboard/page.tsx', 'utf8');
const lines = content.split('\n');

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('service_categories') || lines[i].includes('technician_details') || lines[i].includes('technician_status') || lines[i].includes('update(')) {
    console.log(`Line ${i+1}: ${lines[i].trim()}`);
  }
}
