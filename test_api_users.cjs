const { Client } = require('c:/Users/Olami/OneDrive/Desktop/hfa portal/node_modules/ssh2');
const conn = new Client();

conn.on('ready', () => {
  const script = `
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const http = require('http');

async function test() {
  require('dotenv').config();
  await mongoose.connect('mongodb://127.0.0.1:27017/HfaStaffPortal');
  const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }), 'users');
  const admin = await User.findOne({ role: 'super_admin' });
  const token = jwt.sign({ id: admin._id, username: admin.username, role: admin.role }, process.env.JWT_SECRET || 'skdflsjfllksjdfldslkfjdjfdjdlk', { expiresIn: '1h' });
  
  const options = {
    hostname: '127.0.0.1',
    port: 3002,
    path: '/api/v1/users',
    method: 'GET',
    headers: {
      'Authorization': 'Bearer ' + token
    }
  };
  
  const req = http.request(options, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      const parsed = JSON.parse(data);
      console.log('API /api/v1/users status:', res.statusCode);
      console.log('Total count in response:', parsed.count);
      console.log('Number of users returned:', parsed.data ? parsed.data.length : 0);
      if (parsed.data) {
        console.log('\\nSample users:');
        parsed.data.slice(0, 10).forEach((u, i) => console.log(\`  \${i+1}. \${u.name} | \${u.email} | \${u.role}\`));
      }
      process.exit(0);
    });
  });
  req.on('error', (e) => { console.error(e); process.exit(1); });
  req.end();
}
test();
`;
  const b64 = Buffer.from(script).toString('base64');
  conn.exec(`cd /home/administrator/staff-portal-backend && node -e "eval(Buffer.from('${b64}', 'base64').toString())"`, (err, stream) => {
    if (err) throw err;
    stream.on('data', d => process.stdout.write(d));
    stream.stderr.on('data', d => process.stderr.write(d));
    stream.on('close', () => conn.end());
  });
}).connect({ host: '155.117.43.205', username: 'administrator', password: 'halalfa@123' });
