const connectToDb = require('./config/connectToDb');
const User = require('./models/users');
const bcrypt = require('bcryptjs');

connectToDb().then(async () => {
  const user = await User.findOne({ username: 'admin' }).select('+password');
  if (!user) {
    console.log('❌ admin user not found');
    process.exit(1);
  }
  const match = await bcrypt.compare('Admin@123', user.password);
  console.log('Password match:', match ? '✅ YES - Login will work!' : '❌ NO - Wrong hash');
  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
