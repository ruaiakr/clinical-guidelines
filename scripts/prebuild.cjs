const fs = require('node:fs');
const path = require('node:path');
const {execSync} = require('node:child_process');

const projectRoot = path.join(__dirname, '..');
const buildDir = path.join(projectRoot, 'build');
const ports = [
  Number(process.env.SERVE_PORT || 3000),
  Number(process.env.ADMIN_API_PORT || 8787),
];

function stopPort(port) {
  if (process.platform !== 'win32') {
    try {
      execSync(`lsof -ti:${port} | xargs kill -9`, {stdio: 'ignore'});
    } catch {
      // ignore
    }
    return;
  }

  try {
    const output = execSync(
      `powershell -NoProfile -Command "(Get-NetTCPConnection -LocalPort ${port} -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique)"`,
      {encoding: 'utf8'},
    ).trim();

    for (const pid of output.split(/\s+/).filter(Boolean)) {
      if (Number(pid) > 0) {
        execSync(`taskkill /PID ${pid} /F`, {stdio: 'ignore'});
        console.log(`Stopped process ${pid} on port ${port}.`);
      }
    }
  } catch {
    // ignore
  }
}

console.log('Preparing build folder...');

for (const port of ports) {
  stopPort(port);
}

if (fs.existsSync(buildDir)) {
  try {
    fs.rmSync(buildDir, {recursive: true, force: true, maxRetries: 5, retryDelay: 500});
    console.log('Removed existing build folder.');
  } catch (error) {
    console.error('Could not remove build folder. Close npm/node windows and retry.');
    console.error(error.message);
    process.exit(1);
  }
}
