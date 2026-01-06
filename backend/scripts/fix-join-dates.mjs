import { connectDB } from '../db.js';
import Driver from '../models/driver.js';

// Reuse robust parsing logic (handles Date, ISO strings, dd/mm/yyyy and Excel serials)
function parseDateValue(v) {
  if (!v && v !== 0) return undefined;
  // Strip leading plus signs and trim
  if (typeof v === 'string') v = v.replace(/^\+/, '').trim();

  // Numeric Excel serials (numbers or numeric strings)
  if (typeof v === 'number' && !isNaN(v)) {
    const dt = new Date((v - 25569) * 86400 * 1000);
    if (!isNaN(dt.getTime())) return dt.toISOString().split('T')[0];
  }
  const sRaw = String(v).trim();
  if (/^\d+(?:\.\d+)?$/.test(sRaw)) {
    const n = parseFloat(sRaw);
    if (!isNaN(n)) {
      const dt = new Date((n - 25569) * 86400 * 1000);
      if (!isNaN(dt.getTime())) return dt.toISOString().split('T')[0];
    }
  }

  if (v instanceof Date && !isNaN(v.getTime())) return v.toISOString().split('T')[0];

  // Try native Date parsing
  const d = new Date(sRaw);
  if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];

  // Try dd/mm/yyyy or dd-mm-yyyy
  const m = sRaw.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (m) {
    const [_, dd, mm, yyyy] = m;
    const dt = new Date(`${yyyy}-${mm.padStart(2,'0')}-${dd.padStart(2,'0')}`);
    if (!isNaN(dt.getTime())) return dt.toISOString().split('T')[0];
  }

  return undefined;
}

function isIsoDateString(s) {
  return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);
}

async function main() {
  await connectDB();
  const minYear = 1950;
  const maxYear = new Date().getFullYear() + 5;

  const cursor = Driver.find({ joinDate: { $exists: true, $ne: null } }).cursor();
  let total = 0; let updated = 0; let skipped = 0;
  const failures = [];

  for await (const doc of cursor) {
    total++;
    const jd = doc.joinDate;

    if (isIsoDateString(jd)) continue; // already good

    const normalized = parseDateValue(jd);
    if (normalized) {
      const year = Number(normalized.slice(0,4));
      if (year >= minYear && year <= maxYear) {
        try {
          await Driver.updateOne({ _id: doc._id }, { $set: { joinDate: normalized } });
          updated++;
          continue;
        } catch (err) {
          failures.push({ id: doc._id.toString(), original: jd, error: err.message });
          continue;
        }
      }
    }

    // Could not normalize safely
    skipped++;
    failures.push({ id: doc._id.toString(), original: jd, normalized });
  }

  console.log('Fix-join-dates completed');
  console.log('Processed:', total, 'Updated:', updated, 'Skipped/Needs-review:', skipped);
  if (failures.length > 0) {
    console.log('\nSample failures (first 20):');
    console.log(failures.slice(0,20).map(f => JSON.stringify(f)).join('\n'));
  }
  process.exit(0);
}

main().catch(err => { console.error('Migration failed:', err); process.exit(1); });