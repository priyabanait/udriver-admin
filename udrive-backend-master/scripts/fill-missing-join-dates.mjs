import { connectDB } from '../db.js';
import Driver from '../models/driver.js';

function toDateOnlyString(v) {
  if (!v && v !== 0) return undefined;
  const d = v instanceof Date ? v : new Date(v);
  if (isNaN(d.getTime())) return undefined;
  return d.toISOString().split('T')[0];
}

async function main() {
  await connectDB();

  const dryRun = process.argv.includes('--dry-run') || process.argv.includes('--preview');
  const query = { $or: [{ joinDate: { $exists: false } }, { joinDate: null }, { joinDate: "" }] };

  console.log('Searching for drivers with missing joinDate...');
  const cursor = Driver.find(query).cursor();
  let total = 0; let updated = 0; let skipped = 0;

  for await (const doc of cursor) {
    total++;
    const suggested = toDateOnlyString(doc.createdAt) || new Date().toISOString().split('T')[0];

    if (dryRun) {
      console.log('[DRY RUN] Would set joinDate for', doc._id.toString(), '->', suggested);
      continue;
    }

    try {
      await Driver.updateOne({ _id: doc._id }, { $set: { joinDate: suggested } });
      updated++;
    } catch (err) {
      console.error('Failed to update', doc._id.toString(), err.message);
      skipped++;
    }
  }

  console.log('Done. Processed:', total, 'Updated:', updated, 'Failed/skipped:', skipped);
  process.exit(0);
}

main().catch((err) => { console.error('Migration failed:', err); process.exit(1); });
