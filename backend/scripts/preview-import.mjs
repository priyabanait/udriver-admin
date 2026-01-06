import xlsx from 'xlsx';
import fs from 'fs';
import { connectDB } from '../db.js';
import Driver from '../models/driver.js';

function normalizeKey(k) { return (k || '').toString().trim().toLowerCase(); }
function firstOf(map, choices){ for(const c of choices){ const v = map[normalizeKey(c)]; if (v !== undefined && String(v).trim() !== '') return String(v).trim(); } return undefined; }
function normalizePhone(p){ if (!p && p!==0) return undefined; const s = String(p).replace(/\D/g,'').trim(); return s === '' ? undefined : s; }

async function main(){
  await connectDB();
  const path = process.argv[2] || 'E:/admin Udrive/driver list.xlsx';
  if (!fs.existsSync(path)) { console.error('file missing', path); process.exit(1); }
  const buf = fs.readFileSync(path);
  const wb = xlsx.read(buf, { type: 'buffer' });
  for (const s of wb.SheetNames) {
    const sheet = wb.Sheets[s];
    const rows = xlsx.utils.sheet_to_json(sheet, { header:1, defval: '' });
    const headerIdx = rows.findIndex(r => Array.isArray(r) && r.filter(c=>String(c).trim()!=='').length >= 2);
    if (headerIdx < 0) { console.log('sheet', s, 'no header'); continue; }
    const headers = rows[headerIdx].map(h => String(h).trim());
    const data = rows.slice(headerIdx + 1);
    console.log('\nSheet', s, 'data rows', data.length);
    for (let i = 0; i < Math.min(20, data.length); i++) {
      const row = data[i];
      const map = {};
      for (let j = 0; j < headers.length; j++) map[normalizeKey(headers[j])] = row[j] !== undefined && row[j] !== null ? row[j] : '';
      const mobileRaw = firstOf(map, ['mobile','phone','mobile no','contact','phone number']);
      const mobile = normalizePhone(mobileRaw);
      const last10 = mobile ? mobile.slice(-10) : undefined;
      const aadhar = firstOf(map, ['aadhar','aadhaar','aadhar no']);
      const email = firstOf(map, ['email','e-mail','email address']);
      const emp = firstOf(map, ['employee id','emp id']);
      const conditions = [];
      if (mobile) { conditions.push({ mobile }); conditions.push({ phone: mobile }); if (last10 && last10.length >= 6) { conditions.push({ mobile: { $regex: `${last10}$` } }); conditions.push({ phone: { $regex: `${last10}$` } }); } }
      if (aadhar) conditions.push({ aadharNumber: String(aadhar).trim() });
      if (email) conditions.push({ email: String(email).toLowerCase() });
      if (emp) conditions.push({ employeeId: String(emp).trim() });

      if (conditions.length === 0) { console.log(i, 'no identifiers'); continue; }
      const found = await Driver.findOne({ $or: conditions }).lean();
      console.log(i, 'mobileRaw=', mobileRaw, 'mobileNorm=', mobile, 'found=', found ? `yes id=${found.id} name=${found.name || found.mobile}` : 'no');
    }
  }
  process.exit(0);
}

main();
