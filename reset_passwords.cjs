/**
 * reset_passwords.cjs
 * Updates the 7 newly migrated users' passwords to abc123 on the remote server.
 */

let Client;
try { Client = require('ssh2').Client; } catch {
  Client = require('c:/Users/Olami/OneDrive/Desktop/hfa portal/node_modules/ssh2').Client;
}

const USERS = ['Fwas', 'Jaweria', 'Awal', 'Enas2', 'Shoaib', 'Omer', 'mohammad'];

const remoteScript = `
const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');
const User     = require('/home/administrator/staff-portal-backend/models/users');

async function run() {
  await mongoose.connect('mongodb://127.0.0.1:27017/HfaStaffPortal');
  console.log('Connected.');
  const hashed = await bcrypt.hash('abc123', 12);
  const users = ${JSON.stringify(USERS)};
  for (const u of users) {
    const doc = await User.findOneAndUpdate({ username: u }, { password: hashed });
    console.log(doc ? 'UPDATED: ' + u : 'NOT FOUND: ' + u);
  }
  console.log('All done — password is now: abc123');
  await mongoose.disconnect();
}
run().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
`;

const b64 = Buffer.from(remoteScript).toString('base64');
const cmd = `cd /home/administrator/staff-portal-backend && node -e "eval(Buffer.from('${b64}','base64').toString())"`;

const conn = new Client();
console.log('🚀 Connecting to server...');
conn.on('ready', () => {
  console.log('✅ SSH connected. Updating passwords...\n');
  conn.exec(cmd, (err, stream) => {
    if (err) { console.error(err); conn.end(); return; }
    stream.on('data', d => process.stdout.write(d.toString()));
    stream.stderr.on('data', d => process.stderr.write(d.toString()));
    stream.on('close', code => {
      console.log('\n🏁 Done (exit code ' + code + ')');
      conn.end();
    });
  });
}).on('error', e => console.error('❌ SSH error:', e.message))
  .connect({ host: '155.117.43.205', port: 22, username: 'administrator', password: 'halalfa@123', readyTimeout: 30000 });
