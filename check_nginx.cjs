const { Client } = require('c:/Users/Olami/OneDrive/Desktop/hfa portal/node_modules/ssh2');
const conn = new Client();
conn.on('ready', () => {
  conn.exec('sudo ss -tlpn ; cat /home/administrator/staff-portal-backend/.env', (err, stream) => {
    if (err) throw err;
    stream.on('data', d => process.stdout.write(d));
    stream.stderr.on('data', d => process.stderr.write(d));
    stream.on('close', () => conn.end());
  });
}).connect({
  host: '155.117.43.205',
  port: 22,
  username: 'administrator',
  password: 'halalfa@123'
});
