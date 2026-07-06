const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const root = process.cwd();
const examplePath = path.join(root, 'api', 'config.example.php');
const localPath = path.join(root, 'api', 'config.local.php');

if (fs.existsSync(localPath)) {
  console.log('api/config.local.php already exists.');
  process.exit(0);
}

const password = crypto.randomBytes(9).toString('base64url');
const example = fs.readFileSync(examplePath, 'utf8');
const local = example.replace("'change-me'", `'${password}'`);

fs.writeFileSync(localPath, local, 'utf8');
console.log('Created api/config.local.php');
console.log(`Admin password: ${password}`);
