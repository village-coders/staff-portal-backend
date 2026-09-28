const { Client } = require('c:/Users/Olami/OneDrive/Desktop/hfa portal/node_modules/ssh2');
const conn = new Client();

const remoteScript = `
const mongoose = require('mongoose');

async function run() {
  const client = await mongoose.connect('mongodb://127.0.0.1:27017');
  const adminDb = mongoose.connection.client.db().admin();
  const dbs = await adminDb.listDatabases();
  console.log('Databases:', dbs.databases.map(d => d.name));
  
  for (const d of dbs.databases) {
    if (['admin', 'config', 'local'].includes(d.name)) continue;
    const db = mongoose.connection.client.db(d.name);
    const cols = await db.listCollections().toArray();
    console.log('DB ' + d.name + ' collections:', cols.map(c => c.name));
  }
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
