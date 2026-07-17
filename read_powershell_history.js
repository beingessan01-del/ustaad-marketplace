const fs = require('fs');
const path = require('path');

const historyPath = path.join(process.env.APPDATA, 'Microsoft', 'Windows', 'PowerShell', 'PSReadLine', 'ConsoleHost_history.txt');

if (fs.existsSync(historyPath)) {
  const content = fs.readFileSync(historyPath, 'utf8');
  console.log(content);
} else {
  console.log('PowerShell history file does not exist at:', historyPath);
}
