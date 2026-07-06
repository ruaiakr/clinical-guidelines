const fs = require('node:fs');
const path = require('node:path');
const {execSync} = require('node:child_process');

const projectRoot = process.cwd();
const vhostSource = path.join(projectRoot, 'deploy', 'apache-vhost.conf');
const vhostTarget =
  'C:/wamp64/bin/apache/apache2.4.59/conf/extra/httpd-vhosts.conf';
const hostsPath = path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'drivers', 'etc', 'hosts');
const marker = 'clinical-guidelines.local';
const vhostBlock = fs.readFileSync(vhostSource, 'utf8').trim();

console.log('Setting up WAMP for Clinical Guidelines admin API...\n');

if (!fs.existsSync(vhostTarget)) {
  console.error(`Apache vhosts file not found:\n  ${vhostTarget}`);
  console.error('Update deploy/apache-vhost.conf path for your WAMP install.');
  process.exit(1);
}

let vhosts = fs.readFileSync(vhostTarget, 'utf8');
if (!vhosts.includes(marker)) {
  vhosts = `${vhosts.trim()}\n\n${vhostBlock}\n`;
  fs.writeFileSync(vhostTarget, vhosts, 'utf8');
  console.log('Added virtual host to Apache config.');
} else {
  console.log('Virtual host already present in Apache config.');
}

let hosts = fs.readFileSync(hostsPath, 'utf8');
if (!hosts.includes(marker)) {
  fs.appendFileSync(hostsPath, `\n127.0.0.1 ${marker}\n`, 'utf8');
  console.log('Added hosts file entry.');
} else {
  console.log('Hosts file entry already present.');
}

console.log('\nNext steps:');
console.log('1. Restart WAMP (or Apache only).');
console.log('2. Open http://clinical-guidelines.local/api/health.php');
console.log('3. Run: npm start');
console.log('4. Open: http://localhost:3000/admin');
console.log('\nHealth check test:');

try {
  execSync(
    'powershell -NoProfile -Command "Invoke-WebRequest -Uri http://clinical-guidelines.local/api/health.php -UseBasicParsing | Select-Object -ExpandProperty Content"',
    {stdio: 'inherit'},
  );
} catch {
  console.log('Health check failed until Apache is restarted.');
}
