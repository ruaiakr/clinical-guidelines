const {execSync} = require('node:child_process');

const PORT = process.env.ADMIN_API_PORT || 8787;

try {
  if (process.platform === 'win32') {
    const output = execSync(
      `powershell -NoProfile -Command "(Get-NetTCPConnection -LocalPort ${PORT} -ErrorAction SilentlyContinue | Select-Object -First 1).OwningProcess"`,
      {encoding: 'utf8'},
    ).trim();

    if (output) {
      execSync(`taskkill /PID ${output} /F`, {stdio: 'inherit'});
      console.log(`Stopped admin API process ${output} on port ${PORT}.`);
    } else {
      console.log(`No process is using port ${PORT}.`);
    }
  } else {
    execSync(`lsof -ti:${PORT} | xargs kill -9`, {stdio: 'inherit'});
    console.log(`Stopped process on port ${PORT}.`);
  }
} catch (error) {
  console.log(`No admin API process found on port ${PORT}.`);
}
