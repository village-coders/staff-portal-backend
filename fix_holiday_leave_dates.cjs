/**
 * fix_holiday_leave_dates.cjs
 * Fixes all date fields in Holiday, SubHolidayRe and Wokes collections.
 */
const mongoose = require('mongoose');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/HalalFinance';

// Robust date parser — handles DD-MM-YYYY, DD-Mon-YYYY, YYYY-MM-DD with trailing spaces
function parseDate(raw) {
  if (!raw || raw === 'NULL' || raw === 'null') return null;
  const s = String(raw).trim();
  if (!s) return null;

  // Already ISO-ish: YYYY-MM-DD or YYYY-MM-DDTHH:mm…
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    const d = new Date(s);
    return isNaN(d) ? null : d;
  }

  // DD-Mon-YYYY or DD/Mon/YYYY  e.g. 07-Apr-2021
  const monMatch = s.match(/^(\d{1,2})[-\/]([A-Za-z]{3,9})[-\/](\d{4})$/);
  if (monMatch) {
    const d = new Date(`${monMatch[2]} ${monMatch[1]}, ${monMatch[3]}`);
    return isNaN(d) ? null : d;
  }

  // DD-MM-YYYY or DD/MM/YYYY
  const dmy = s.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})$/);
  if (dmy) {
    const d = new Date(`${dmy[3]}-${dmy[2].padStart(2,'0')}-${dmy[1].padStart(2,'0')}`);
    return isNaN(d) ? null : d;
  }

  // Last resort
  const d = new Date(s);
  return isNaN(d) ? null : d;
}

async function run() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');
  const db = mongoose.connection.db;

  // ─── 1. tlbHoliday ───────────────────────────────────────────────────────
  {
    const col = db.collection('tlbHoliday');
    const docs = await col.find({}).toArray();
    console.log(`\nHoliday records: ${docs.length}`);
    let fixed = 0;
    for (const doc of docs) {
      const update = {};
      for (const key of ['DateSet', 'BlaDate']) {
        if (doc[key]) {
          const d = parseDate(doc[key]);
          if (d && !(doc[key] instanceof Date)) {
            update[key] = d;
          }
        }
      }
      if (Object.keys(update).length) {
        await col.updateOne({ _id: doc._id }, { $set: update });
        fixed++;
      }
    }
    console.log(`  Fixed ${fixed} holiday records`);
  }

  // ─── 2. tlbsubHolidayRe ──────────────────────────────────────────────────
  {
    const col = db.collection('tlbsubHolidayRe');
    const docs = await col.find({}).toArray();
    console.log(`\nLeave request records: ${docs.length}`);
    let fixed = 0;
    for (const doc of docs) {
      const update = {};
      for (const key of ['DateRequsted', 'ApprDate', 'BegingDate', 'EndingDate']) {
        if (doc[key]) {
          const d = parseDate(doc[key]);
          if (d && !(doc[key] instanceof Date)) {
            update[key] = d;
          }
        }
      }
      if (Object.keys(update).length) {
        await col.updateOne({ _id: doc._id }, { $set: update });
        fixed++;
      }
    }
    console.log(`  Fixed ${fixed} leave request records`);
  }

  // ─── 3. tlbWokes (working days / weekends) ───────────────────────────────
  {
    const col = db.collection('tlbWokes');
    const docs = await col.find({}).toArray();
    console.log(`\nWokes records: ${docs.length}`);
    let fixed = 0;
    for (const doc of docs) {
      const update = {};
      if (doc['Datee']) {
        const d = parseDate(doc['Datee']);
        if (d && !(doc['Datee'] instanceof Date)) {
          update['Datee'] = d;
        }
      }
      if (Object.keys(update).length) {
        await col.updateOne({ _id: doc._id }, { $set: update });
        fixed++;
      }
    }
    console.log(`  Fixed ${fixed} wokes records`);
  }

  // ─── Verify ───────────────────────────────────────────────────────────────
  console.log('\n=== VERIFICATION ===');
  const h = await db.collection('tlbHoliday').findOne({});
  console.log('Holiday sample DateSet:', h?.DateSet);

  const l = await db.collection('tlbsubHolidayRe').findOne({});
  console.log('Leave sample BegingDate:', l?.BegingDate, '| EndingDate:', l?.EndingDate);

  const w = await db.collection('tlbWokes').findOne({});
  console.log('Wokes sample Datee:', w?.Datee);

  await mongoose.disconnect();
  console.log('\nAll done!');
}

run().catch(err => { console.error(err); process.exit(1); });
