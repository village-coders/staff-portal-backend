const mongoose = require('mongoose');
async function run() {
  await mongoose.connect('mongodb://127.0.0.1:27017/HfaStaffPortal');
  const db = mongoose.connection.db;
  const statusAgg = await db.collection('claims').aggregate([
    { $group: { _id: '$status', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]).toArray();
  console.log('Status breakdown:');
  statusAgg.forEach(s => console.log(' ', s._id, ':', s.count));
  const total = await db.collection('claims').countDocuments();
  console.log('Total:', total);
  await mongoose.disconnect();
}
run().catch(console.error);
