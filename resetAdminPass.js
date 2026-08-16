const connectToDb = require('./config/connectToDb');
const User = require('./models/users');
const bcrypt = require('bcryptjs');

connectToDb().then(async () => {
  const hash = await bcrypt.hash('Admin@123', 12);
  const res = await User.updateOne(
    { username: 'admin' },
    { $set: { password: hash, active: true } }
  );
  console.log('Update result:', res);
  console.log('Admin password successfully set to Admin@123 ✅');
  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
