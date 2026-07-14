const fs = require('fs');
const content = fs.readFileSync('app/technician-dashboard/page.tsx', 'utf8');
const lines = content.split('\n');

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('watchPosition') || lines[i].includes('geolocation') || lines[i].includes('location') || lines[i].includes('lat')) {
    if (lines[i].trim().length < 120) {
      console.log(`Line ${i+1}: ${lines[i].trim()}`);
    }
  }
}
