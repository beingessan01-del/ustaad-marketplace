const fs = require('fs');

if (fs.existsSync('middleware.ts')) {
  console.log('middleware.ts content:');
  console.log(fs.readFileSync('middleware.ts', 'utf8'));
} else if (fs.existsSync('middleware.js')) {
  console.log('middleware.js content:');
  console.log(fs.readFileSync('middleware.js', 'utf8'));
} else {
  console.log('No middleware file found in root.');
}
