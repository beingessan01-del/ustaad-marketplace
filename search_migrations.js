const fs = require('fs');
const path = require('path');

const logPath = 'C:\\Users\\cww\\.gemini\\antigravity\\brain\\fb959740-4a56-468c-8833-a8c828d2a73b\\.system_generated\\logs\\transcript.jsonl';

if (fs.existsSync(logPath)) {
  const content = fs.readFileSync(logPath, 'utf8');
  const lines = content.split('\n');
  console.log(`Found transcript with ${lines.length} lines.`);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes('2026-07-17')) continue; // Skip today's steps
    if (line.includes('migration') || line.includes('push') || line.includes('sql') || line.includes('apply')) {
      // Parse step index and content if possible
      try {
        const obj = JSON.parse(line);
        console.log(`Step ${obj.step_index} (${obj.type}): ${obj.content ? obj.content.substring(0, 150) : ''}`);
        if (obj.tool_calls) {
          console.log(`  Tools: ${JSON.stringify(obj.tool_calls).substring(0, 150)}`);
        }
      } catch (e) {
        console.log(`Line ${i + 1} (raw): ${line.substring(0, 150)}`);
      }
    }
  }
} else {
  console.log('Transcript log file does not exist at:', logPath);
}
