const { Client } = require('c:/Users/Olami/OneDrive/Desktop/hfa portal/node_modules/ssh2');
const conn = new Client();

const remoteScript = `
const mongoose = require('mongoose');

async function run() {
  await mongoose.connect('mongodb://127.0.0.1:27017/hfa_portal_dev');
  const db = mongoose.connection.db;
  const admins = await db.collection('admins').find({}, { projection: { password: 0 } }).toArray();
  console.log('Admins in hfa_portal_dev:');
  console.log(admins);
  
  const staff = await db.collection('users').find({ role: { $ne: 'client' } }, { projection: { password: 0 } }).limit(10).toArray();
  console.log('Staff in hfa_portal_dev:');
  console.log(staff);
  await mongoose.disconnect();
}
run().catch(console.error);
`;

conn.on('ready', () => {
  const b64 = Buffer.from(remoteScript).toString('base64');
  conn.exec(`cd /home/administrator/staff-portal-backend && node -e "eval(Buffer.from('${b64}', 'base64').toString())"`, (err, stream) => {
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
