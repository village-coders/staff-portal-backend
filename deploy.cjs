/**
 * Deploy IFRS Staff Portal Backend to Ubuntu Production Server
 * Usage: node deploy.cjs
 */
const path = require('path');
let Client;
try {
  Client = require('ssh2').Client;
} catch {
  // Try locating from sibling project if not installed here
  Client = require('c:/Users/Olami/OneDrive/Desktop/hfa portal/node_modules/ssh2').Client;
}

const SERVER = {
  host: '155.117.43.205',
  port: 22,
  username: 'administrator',
  password: 'halalfa@123',
  readyTimeout: 30000
};

console.log('🚀 Connecting to Ubuntu server (' + SERVER.host + ')...');

const conn = new Client();

conn.on('ready', () => {
  console.log('✅ SSH connected successfully.');

  const deployScript = `
set -e
echo "=== 1. Navigating to repository ==="
cd /home/administrator/staff-portal-backend

echo "=== 2. Cleaning working tree ==="
git reset --hard HEAD
git clean -fd

echo "=== 3. Pulling origin main ==="
git pull origin main

echo "=== 4. Latest commit ==="
git log -n 1 --oneline

echo "=== 5. Installing dependencies ==="
npm install --omit=dev

echo "=== 6. Reloading PM2 process ==="
pm2 reload hfa-staff-backend || pm2 restart hfa-staff-backend
pm2 save

echo "=== 7. Verifying status ==="
sleep 3
pm2 show hfa-staff-backend | grep -E "status|uptime|restarts"
curl -s -i http://127.0.0.1:3002/ | head -n 10
  `;

  conn.exec(deployScript, (err, stream) => {
    if (err) {
      console.error('Execution error:', err);
      conn.end();
      return;
    }

    stream.on('close', (code) => {
      console.log('\\n🏁 Deployment completed with exit code ' + code);
      conn.end();
    });

    stream.on('data', (d) => process.stdout.write(d.toString()));
    stream.stderr.on('data', (d) => process.stderr.write(d.toString()));
  });
}).on('error', (err) => {
  console.error('❌ Connection error:', err.message);
}).connect(SERVER);
