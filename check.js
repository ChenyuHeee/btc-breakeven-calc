const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');
const scriptMatch = html.match(/<script>([\s\S]*)<\/script>/);
if (!scriptMatch) { console.error('no script'); process.exit(1); }
try {
  new Function(scriptMatch[1]);
  console.log('JS syntax OK');
} catch(e) {
  console.error('Syntax error:', e.message);
  process.exit(1);
}
