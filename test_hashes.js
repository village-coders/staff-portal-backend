const bcrypt = require('bcryptjs');

const users = [
  { name: 'Taoheed', hash: '$2a$12$goDvcM5gcVdL2m22wY7mVuEoAphOwJ82H7SZPNQTiJrfIyBjg2bB2' },
  { name: 'Muhayad', hash: '$2a$12$TQwp6WuBD3tLIDReJsZdjexj.YmV6p9Y6CNpUpvL7BB5Lv9GitSpy' },
  { name: 'Financial Officer', hash: '$2a$12$jKVPCYvvjwNXv7n29uAakOJhHOK3OR1fRO2J0EZpAFWN6a8MqIyYW' },
  { name: 'Accountant', hash: '$2a$12$Yc4niwT9v/rwdcoj.9kk4e9uPuwzdXgEKMwojV1ljsr5CffxRQxtO' },
  { name: 'Ceo', hash: '$2a$12$itJO7ZV4.QA0.UuXO4a90O7eG7IjqfgsQBEslXEyh/mRm5GqeJ82m' },
  { name: 'Chaiman', hash: '$2a$12$VpQKDTlhj0exZ.fpGFI3jur7AvfcybPLaTKWbo/e2s.GJ9YkzOWf.' }
];

const passwords = [
  'admin', 'Admin', 'Admin@123', 'admin@123', 'Admin123', 'admin123',
  'password', 'Password', 'Password@123', 'password@123', 'Password123', 'password123',
  'halalfa@123', 'Halalfa@123', 'halal@123', 'Halal@123', 'HalalFood@123',
  '123456', '12345678', '123456789',
  'Taoheed', 'taoheed', 'Taoheed@123', 'taoheed@123', 'get2lekan', 'get2lekan@yahoo.com',
  'Muhayad', 'muhayad', 'Muhayad@123', 'muhayad@123', 'muhayadola',
  'ademight', 'Ademight', 'ademight07', 'Ademight07', 'ademight@123', 'Ademight@123',
  'alooma', 'Alooma', 'alooma@123', 'Alooma@123', 'olabode', 'Olabode', 'Olabode@123',
  'opeyemi', 'Opeyemi', 'opeyemi@123', 'Opeyemi@123', 'alaniopeyemi',
  'Hfa@123', 'HFA@123', 'HfaStaff@123', 'Staff@123', 'staff@123',
  'Ceo@123', 'ceo@123', 'Chairman@123', 'chairman@123', 'Chaiman@123', 'Accountant@123', 'accountant@123',
  'SuperAdmin@123', 'superadmin@123'
];

async function check() {
  for (const u of users) {
    for (const p of passwords) {
      if (await bcrypt.compare(p, u.hash)) {
        console.log(`FOUND! User: ${u.name} -> Password: "${p}"`);
        break;
      }
    }
  }
  console.log('Finished testing candidates.');
}
check();
