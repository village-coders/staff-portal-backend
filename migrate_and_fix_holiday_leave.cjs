/**
 * migrate_and_fix_holiday_leave.cjs
 * Migrates tlbHoliday, tlbsubHolidayRe, tlbWokes into MongoDB
 * and converts all date strings to proper Date objects.
 */
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const MONGO_URI = 'mongodb://127.0.0.1:27017/HfaStaffPortal';
const JSON_DIR = path.resolve(__dirname, '../database_scripts/HalalAcc/json_exports');

function readJsonBom(file) {
  let raw = fs.readFileSync(path.join(JSON_DIR, file), 'utf8');
  raw = raw.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
  return JSON.parse(raw);
}

function parseDate(raw) {
  if (!raw || raw === 'NULL' || raw === 'null') return null;
  const s = String(raw).trim();
  if (!s) return null;

  // ISO-ish YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    const d = new Date(s);
    return isNaN(d) ? null : d;
  }
  // DD-Mon-YYYY e.g. 07-Apr-2021
  const monMatch = s.match(/^(\d{1,2})[-\/\s]([A-Za-z]{3,9})[-\/\s](\d{4})$/);
  if (monMatch) {
    const d = new Date(`${monMatch[2]} ${monMatch[1]}, ${monMatch[3]}`);
    return isNaN(d) ? null : d;
  }
  // DD-MM-YYYY
  const dmy = s.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})$/);
  if (dmy) {
    const d = new Date(`${dmy[3]}-${dmy[2].padStart(2,'0')}-${dmy[1].padStart(2,'0')}`);
    return isNaN(d) ? null : d;
  }
  const d = new Date(s);
  return isNaN(d) ? null : d;
}

function fixDates(obj, dateKeys) {
  const out = { ...obj };
  for (const k of dateKeys) {
    if (out[k]) {
      const d = parseDate(out[k]);
      if (d) out[k] = d;
    }
  }
  return out;
}

async function run() {
  await mongoose.connect(MONGO_URI);
  console.log('✅ Connected to MongoDB:', MONGO_URI);
  const db = mongoose.connection.db;

  // ─── 1. tlbHoliday ─────────────────────────────────────────────────────────
  {
    const raw = readJsonBom('tlbHoliday.json');
    const arr = Array.isArray(raw) ? raw : raw.data || [];
    const col = db.collection('tlbHoliday');
    await col.drop().catch(() => {});
    const docs = arr.map(r => fixDates(r, ['DateSet', 'BlaDate']));
    if (docs.length) {
      await col.insertMany(docs);
      await col.createIndex({ Yearr: 1 });
    }
    console.log(`✅ tlbHoliday: ${docs.length} records migrated`);
    // Sample
    const s = await col.findOne({});
    console.log('  Sample DateSet:', s?.DateSet, '| BlaDate:', s?.BlaDate);
  }

  // ─── 2. tlbsubHolidayRe ────────────────────────────────────────────────────
  {
    const raw = readJsonBom('tlbsubHolidayRe.json');
    const arr = Array.isArray(raw) ? raw : raw.data || [];
    const col = db.collection('tlbsubHolidayRe');
    await col.drop().catch(() => {});
    const docs = arr.map(r => fixDates(r, ['DateRequsted', 'ApprDate', 'BegingDate', 'EndingDate']));
    if (docs.length) {
      await col.insertMany(docs);
      await col.createIndex({ BegingDate: 1 });
      await col.createIndex({ EndingDate: 1 });
    }
    console.log(`✅ tlbsubHolidayRe: ${docs.length} records migrated`);
    const s = await col.findOne({});
    console.log('  Sample BegingDate:', s?.BegingDate, '| EndingDate:', s?.EndingDate);
  }

  // ─── 3. tlbWokes ───────────────────────────────────────────────────────────
  {
    const raw = readJsonBom('tlbWokes.json');
    const arr = Array.isArray(raw) ? raw : raw.data || [];
    const col = db.collection('tlbWokes');
    await col.drop().catch(() => {});
    const docs = arr.map(r => fixDates(r, ['Datee']));
    if (docs.length) {
      await col.insertMany(docs);
      await col.createIndex({ Datee: 1 });
    }
    console.log(`✅ tlbWokes: ${docs.length} records migrated`);
    const s = await col.findOne({});
    console.log('  Sample Datee:', s?.Datee);
  }

  // ─── Final collection list ──────────────────────────────────────────────────
  const cols = await db.listCollections().toArray();
  console.log('\n📦 All collections now:', cols.map(c => c.name).join(', '));

  await mongoose.disconnect();
  console.log('\n🎉 Migration complete!');
}

run().catch(err => { console.error('❌', err.message); process.exit(1); });
