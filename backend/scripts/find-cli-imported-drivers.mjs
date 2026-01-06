import { connectDB } from '../db.js';
import Driver from '../models/driver.js';

async function main() {
  try {
    const args = process.argv.slice(2);
    const previewOnly = !args.includes('--delete');
    const daysArg = args.find(a => a.startsWith('--older-than='));
    const olderThanDays = daysArg ? Number(daysArg.split('=')[1]) : null;
    const sinceArg = args.find(a => a.startsWith('--since='));
    const untilArg = args.find(a => a.startsWith('--until='));
    const sinceDate = sinceArg ? new Date(sinceArg.split('=')[1]) : null;
    const untilDate = untilArg ? new Date(untilArg.split('=')[1]) : null;
    const isToday = args.includes('--today');

    await connectDB();

    const cond = { isManualEntry: true };

    if (isToday) {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const end = new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1);
      cond.createdAt = { $gte: start, $lte: end };
    } else if (sinceDate || untilDate) {
      if (sinceDate && isNaN(sinceDate.getTime())) throw new Error('Invalid --since date');
      if (untilDate && isNaN(untilDate.getTime())) throw new Error('Invalid --until date');
      const range = {};
      if (sinceDate) range.$gte = sinceDate;
      if (untilDate) range.$lte = untilDate;
      cond.createdAt = range;
    } else if (olderThanDays !== null && !isNaN(olderThanDays)) {
      const cutoff = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);
      cond.createdAt = { $lte: cutoff };
    }

    const count = await Driver.countDocuments(cond);
    console.log(`Found ${count} driver(s) matching`, cond);

    const sample = await Driver.find(cond)
      .sort({ createdAt: -1 })
      .limit(25)
      .select('id name mobile email aadharNumber udbId driverNo createdAt isManualEntry')
      .lean();

    console.table(sample.map(d => ({
      _id: d._id.toString(),
      id: d.id || null,
      name: d.name || null,
      mobile: d.mobile || d.phone || null,
      email: d.email || null,
      aadhar: d.aadharNumber || null,
      udbId: d.udbId || null,
      driverNo: d.driverNo || null,
      createdAt: d.createdAt ? d.createdAt.toISOString() : null,
      isManualEntry: !!d.isManualEntry
    })));

    if (!previewOnly) {
      const delRes = await Driver.deleteMany(cond);
      console.log('Deletion result:', delRes);
    } else {
      console.log('\nPreview only; to delete these records run:');
      console.log('  node scripts/find-cli-imported-drivers.mjs --delete');
      console.log('Options to restrict which records:');
      console.log('  --today               # target records created today');
      console.log('  --since=YYYY-MM-DD    # start date (inclusive)');
      console.log('  --until=YYYY-MM-DD    # end date (inclusive)');
      console.log('  --older-than=<days>   # target records older than N days');
    }

    process.exit(0);
  } catch (err) {
    console.error('Script failed:', err);
    process.exit(1);
  }
}

main();