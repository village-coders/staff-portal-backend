const { Client } = require('c:/Users/Olami/OneDrive/Desktop/hfa portal/node_modules/ssh2');
const conn = new Client();

const remoteScript = `
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const candidates = [
  'Admin@123',
  'SuperAdmin@123',
  'halalfa@123',
  'Halalfa@123',
  'password',
  'Password@123',
  '123456',
  'admin',
  'Taoheed',
  'Ceo',
  'Accountant',
  'Muhayad',
  'Hfa@123',
  'HFA@123'
];

async function run() {
  await mongoose.connect('mongodb://127.0.0.1:27017/HfaStaffPortal');
  const User = mongoose.model('User', new mongoose.Schema({ password: { type: String, select: true } }, { strict: false }), 'users');
  const users = await User.find({}).select('+password').lean();
  for (const u of users) {
    console.log('Testing user:', u.username, 'role:', u.role);
    let matched = null;
    for (const c of candidates) {
      if (await bcrypt.compare(c, u.password)) {
        matched = c;
        break;
      }
    }
    console.log('  -> Match:', matched || 'NO MATCH FOUND in list');
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
