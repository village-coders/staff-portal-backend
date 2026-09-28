const { Client } = require('c:/Users/Olami/OneDrive/Desktop/hfa portal/node_modules/ssh2');
const conn = new Client();
conn.on('ready', () => {
  conn.exec('tail -n 10 /home/administrator/.pm2/logs/hfa-staff-backend-out.log', (err, stream) => {
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
