const os = require('node:os');

function getLanAddresses() {
  const addresses = [];

  for (const interfaces of Object.values(os.networkInterfaces())) {
    if (!interfaces) {
      continue;
    }

    for (const details of interfaces) {
      if (details.family === 'IPv4' && !details.internal) {
        addresses.push(details.address);
      }
    }
  }

  return addresses;
}

const port = process.env.PORT || 3000;
const addresses = getLanAddresses();

console.log('\nOpen on this PC:');
console.log(`  http://localhost:${port}`);

console.log('\nPhone / tablet access (same Wi-Fi):');
if (addresses.length === 0) {
  console.log(`  http://YOUR-PC-IP:${port}`);
} else {
  for (const address of addresses) {
    console.log(`  http://${address}:${port}`);
  }
  console.log(`\n>>> Use one of the URLs above — NOT a guessed IP like .142 if your PC is .141 <<<`);
}

console.log('\nNotes:');
console.log('- URL must include two slashes: http://192.168.1.141:3000');
console.log('- Run "ipconfig" if your IP changes after reconnecting to Wi-Fi');
console.log('- PWA install on phone: npm run serve:lan (then open the URL above)');
console.log('- Allow Node.js through Windows Firewall if the page still does not load.');
console.log('');
