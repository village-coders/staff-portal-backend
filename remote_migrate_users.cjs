/**
 * remote_migrate_users.cjs
 * ─────────────────────────────────────────────────────────────
 * SSHes into the Ubuntu production server and runs the user
 * migration inline — importing all 53 users from tlbWokes.json
 * directly into the server's local MongoDB.
 *
 * Run: node remote_migrate_users.cjs
 */

let Client;
try {
  Client = require('ssh2').Client;
} catch {
  Client = require('c:/Users/Olami/OneDrive/Desktop/hfa portal/node_modules/ssh2').Client;
}

const SERVER = {
  host:         '155.117.43.205',
  port:         22,
  username:     'administrator',
  password:     'halalfa@123',
  readyTimeout: 30000
};

// ── All 53 users from tlbWokes.json ─────────────────────────
// rolss: 1=user, 2=financial_officer, 4=accountant, 5=admin, 6=chairman
const USERS = [
  { username:"Builder",    name:"Builder",             dept:"Admin",          rolss:5 },
  { username:"Taoheed",    name:"Taoheed",             dept:"Staff",          rolss:5 },
  { username:"Amir",       name:"Amir",                dept:"CEO",            rolss:5 },
  { username:"Hifza",      name:"Hifza",               dept:"Scheme Manager", rolss:1 },
  { username:"Akbar",      name:"Akbar",               dept:"Admin",          rolss:4 },
  { username:"Shabnam",    name:"Shabnam",             dept:"Food Tech",      rolss:1 },
  { username:"Shirin",     name:"Shirin",              dept:"Food Tech",      rolss:1 },
  { username:"Shehab",     name:"Shehab",              dept:"Admin",          rolss:1 },
  { username:"Rashid",     name:"Rashid",              dept:"Admin",          rolss:1 },
  { username:"Ali",        name:"Ali",                 dept:"Auditor",        rolss:1 },
  { username:"Imtiaz",     name:"Imtiaz",              dept:"Auditor",        rolss:5 },
  { username:"External",   name:"External",            dept:"Account",        rolss:1 },
  { username:"Enas",       name:"Enas",                dept:"Audit Manager",  rolss:1 },
  { username:"Matin",      name:"Matin",               dept:"Chairman",       rolss:6 },
  { username:"Haidir",     name:"Haidir",              dept:"Staff",          rolss:1 },
  { username:"ICT",        name:"ICT",                 dept:"ICT",            rolss:1 },
  { username:"Mansur",     name:"Mansur",              dept:"External",       rolss:1 },
  { username:"Kenan",      name:"Kenan",               dept:"Staff",          rolss:1 },
  { username:"Wahhab",     name:"Wahhab",              dept:"Mufti",          rolss:1 },
  { username:"Hanif",      name:"Hanif",               dept:"Mufti",          rolss:1 },
  { username:"Abuyusha",   name:"Abuyusha",            dept:"Mufti",          rolss:1 },
  { username:"Sufyan",     name:"Sufyan",              dept:"Mufti",          rolss:1 },
  { username:"Saed",       name:"Saed",                dept:"FT",             rolss:1 },
  { username:"Ibrahim",    name:"Ibrahim",             dept:"Staff",          rolss:1 },
  { username:"Sadia",      name:"Sadia",               dept:"Staff",          rolss:1 },
  { username:"Nadeem",     name:"Nadeem",              dept:"Staff",          rolss:1 },
  { username:"Muhammad",   name:"Muhammad",            dept:"IT",             rolss:1 },
  { username:"SadarQadri", name:"SadarQadri",          dept:"Staff",          rolss:1 },
  { username:"Abusayed",   name:"Abu Sayed Ansarey",   dept:"Staff",          rolss:1 },
  { username:"Haroon",     name:"Haroon",              dept:"Staff",          rolss:1 },
  { username:"ILYAAS",     name:"Ilyaas",              dept:"Sharia advisor", rolss:1 },
  { username:"External2",  name:"External2",           dept:"Staff",          rolss:1 },
  { username:"Kenan2",     name:"Kenan2",              dept:"Staff",          rolss:1 },
  { username:"Kenan3",     name:"Kenan3",              dept:"Staff",          rolss:1 },
  { username:"Caner",      name:"Caner",               dept:"Staff",          rolss:1 },
  { username:"Hameed",     name:"Hameed",              dept:"Staff",          rolss:1 },
  { username:"Khadija",    name:"Khadija",             dept:"Staff",          rolss:1 },
  { username:"Uroos",      name:"Uroos",               dept:"Social Media",   rolss:1 },
  { username:"Riaz",       name:"Riaz",                dept:"Staff",          rolss:1 },
  { username:"Fwas",       name:"Fwas",                dept:"Staff",          rolss:1 },
  { username:"Jaweria",    name:"Jaweria Asad",        dept:"Account",        rolss:2 },
  { username:"Awal",       name:"Awal",                dept:"Staff",          rolss:1 },
  { username:"Enas2",      name:"Enas2",               dept:"Audit",          rolss:1 },
  { username:"Shoaib",     name:"Shoaib",              dept:"Staff",          rolss:1 },
  { username:"Omer",       name:"Omer Farooq Farooqi", dept:"Staff",          rolss:1 },
  { username:"mohammad",   name:"Mohammad Alamullah",  dept:"Staff",          rolss:1 },
];

const ROLE_MAP = { 1:"user", 2:"financial_officer", 4:"accountant", 5:"admin", 6:"chairman" };
const TEMP_PASS = "HFA@2026";

// Build the Node.js script that will run ON the server
const remoteScript = `
const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const ROLE_MAP = ${JSON.stringify(ROLE_MAP)};
const USERS    = ${JSON.stringify(USERS)};
const TEMP_PASS = "${TEMP_PASS}";

// Load User model from the server's codebase
const User = require('/home/administrator/staff-portal-backend/models/users');

async function run() {
  await mongoose.connect('mongodb://127.0.0.1:27017/HfaStaffPortal');
  console.log('Connected to local MongoDB');

  const hashed = await bcrypt.hash(TEMP_PASS, 12);
  let created = 0, skipped = 0;

  for (const u of USERS) {
    const existing = await User.findOne({ username: { $regex: new RegExp('^' + u.username + '$', 'i') } });
    if (existing) {
      console.log('SKIP (exists): ' + u.username);
      skipped++;
      continue;
    }
    const role  = ROLE_MAP[u.rolss] || 'user';
    const email = u.username.toLowerCase().replace(/[^a-z0-9._-]/g,'') + '@hfa-migrated.local';
    await User.create({ name:u.name, username:u.username, email, role, password:hashed, department:u.dept, active:true });
    console.log('CREATED [' + role + ']: ' + u.username + ' — ' + u.name);
    created++;
  }

  const total = await User.countDocuments();
  console.log('\\n=== DONE ===');
  console.log('Created : ' + created);
  console.log('Skipped : ' + skipped);
  console.log('Total in DB: ' + total);
  console.log('Temp password: ' + TEMP_PASS);
  await mongoose.disconnect();
}
run().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
`;

const b64 = Buffer.from(remoteScript).toString('base64');
const remoteCmd = `cd /home/administrator/staff-portal-backend && node -e "eval(Buffer.from('${b64}','base64').toString())"`;

console.log('🚀 Connecting to Ubuntu server (' + SERVER.host + ')...');

const conn = new Client();
conn.on('ready', () => {
  console.log('✅ SSH connected. Running migration...\n');
  conn.exec(remoteCmd, (err, stream) => {
    if (err) { console.error('Exec error:', err); conn.end(); return; }
    stream.on('data', d => process.stdout.write(d.toString()));
    stream.stderr.on('data', d => process.stderr.write(d.toString()));
    stream.on('close', code => {
      console.log('\n🏁 Migration finished with exit code ' + code);
      conn.end();
    });
  });
}).on('error', err => {
  console.error('❌ SSH error:', err.message);
}).connect(SERVER);
