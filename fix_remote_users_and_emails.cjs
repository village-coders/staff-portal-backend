const { Client } = require('c:/Users/Olami/OneDrive/Desktop/hfa portal/node_modules/ssh2');
const conn = new Client();

const remoteScript = `
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

async function run() {
  await mongoose.connect('mongodb://127.0.0.1:27017/HfaStaffPortal');
  console.log('Connected to MongoDB');

  const User = mongoose.model('User', new mongoose.Schema({
    name: String,
    username: { type: String, unique: true },
    email: { type: String, unique: true },
    password: { type: String },
    role: { type: String },
    department: { type: String },
    active: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
  }, { strict: false }), 'users');

  // 1. Fix all @hfa-migrated.local emails
  const migratedUsers = await User.find({ email: /@hfa-migrated\.local$/i });
  console.log('Found migrated users with @hfa-migrated.local:', migratedUsers.length);
  for (const u of migratedUsers) {
    const fixedEmail = u.username.toLowerCase().replace(/[^a-z0-9._-]/g, '') + '@halalfoodauthority.com';
    u.email = fixedEmail;
    await u.save();
    console.log(\`  Updated \${u.username} -> \${fixedEmail}\`);
  }

  // 2. Fix specific mangled emails from UserID
  const emailFixes = [
    { username: 'shahjaberhotmailcom', email: 'shah.jaber@hotmail.com' },
    { username: 'drsarmadshafiqgmailcom', email: 'drsarmadshafiq@gmail.com' },
    { username: 'msayin83gmailcom', email: 'msayin83@gmail.com' }
  ];
  for (const f of emailFixes) {
    const u = await User.findOne({ username: f.username });
    if (u) {
      u.email = f.email;
      await u.save();
      console.log(\`  Fixed \${u.username} email -> \${f.email}\`);
    }
  }

  // 3. Ensure all missing staff users from irsdb / claimants / tlbWokes are created
  const defaultHash = await bcrypt.hash('abc123', 12);
  const additionalUsers = [
    { name: 'Alamu', username: 'alamu', email: 'alamu@halalfoodauthority.com', role: 'user', department: 'Staff' },
    { name: 'Saqib Muhammad', username: 'saqib', email: 'saqib@halalfoodauthority.com', role: 'user', department: 'Staff' },
    { name: 'Hassan Gul', username: 'hassan', email: 'hasan@halalfoodauthority.com', role: 'user', department: 'Staff' },
    { name: 'Laiba Saqib', username: 'laiba', email: 'laiba@halalfoodauthority.com', role: 'financial_officer', department: 'Accounts' },
    { name: 'Salahudeen Kara', username: 'salahudeen', email: 'salahudeen@halalfoodauthority.com', role: 'accountant', department: 'Accounts' },
    { name: 'Ayben Kara', username: 'ayben', email: 'ayben@halalfoodauthority.com', role: 'financial_officer', department: 'Accounts' },
    { name: 'Tanveer Parkar', username: 'tanveer', email: 'tanveer@halalfoodauthority.com', role: 'financial_officer', department: 'Accounts' },
    { name: 'Moin Deen', username: 'moin', email: 'moin@halalfoodauthority.com', role: 'accountant', department: 'Accounts' },
    { name: 'Haris', username: 'haris', email: 'haris@halalfoodauthority.com', role: 'user', department: 'Staff' },
    { name: 'Muzamil', username: 'muzamil', email: 'muzamil@halalfoodauthority.com', role: 'user', department: 'Staff' },
    { name: 'Mushtaq', username: 'mushtaq', email: 'mushtaq@halalfoodauthority.com', role: 'user', department: 'Staff' },
    { name: 'Yusuf Chagtai', username: 'yusuf', email: 'yusufchagtai@gmail.com', role: 'user', department: 'Staff' }
  ];

  let addedCount = 0;
  for (const nu of additionalUsers) {
    const existing = await User.findOne({
      $or: [
        { username: { $regex: new RegExp('^' + nu.username + '$', 'i') } },
        { email: nu.email.toLowerCase() }
      ]
    });
    if (!existing) {
      await User.create({
        name: nu.name,
        username: nu.username,
        email: nu.email.toLowerCase(),
        password: defaultHash,
        role: nu.role,
        department: nu.department,
        active: true,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      console.log(\`  Added missing user: \${nu.username} (\${nu.name}) - \${nu.email}\`);
      addedCount++;
    } else {
      console.log(\`  User already exists: \${nu.username}\`);
    }
  }

  // 4. Output final status
  const total = await User.countDocuments();
  console.log('\\n=== SUMMARY ===');
  console.log('Total users now in DB:', total);
  console.log('New users added:', addedCount);

  const all = await User.find({}).select('username name email role active').lean();
  console.log('\\nListing all current users:');
  all.forEach((u, idx) => {
    console.log(\`\${idx + 1}. [\${u.username}] \${u.name} | \${u.email} | \${u.role}\`);
  });

  await mongoose.disconnect();
}

run().catch(err => {
  console.error('Migration error:', err);
  process.exit(1);
});
`;

conn.on('ready', () => {
  const b64 = Buffer.from(remoteScript).toString('base64');
  conn.exec(`cd /home/administrator/staff-portal-backend && node -e "eval(Buffer.from('${b64}', 'base64').toString())"`, (err, stream) => {
    if (err) throw err;
    stream.on('data', d => process.stdout.write(d));
    stream.stderr.on('data', d => process.stderr.write(d));
    stream.on('close', () => {
      conn.end();
      console.log('\n✅ Remote script execution finished.');
    });
  });
}).connect({
  host: '155.117.43.205',
  port: 22,
  username: 'administrator',
  password: 'halalfa@123'
});
