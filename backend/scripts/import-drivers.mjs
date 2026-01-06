import path from 'path';
import fs from 'fs';
import xlsx from 'xlsx';
import { connectDB } from '../db.js';
import Driver from '../models/driver.js';
import { normalizeToDateOnly } from '../lib/dateUtils.js';

function normalizeKey(k) {
  return (k || '').toString().trim().toLowerCase();
}

function makeRowMap(row) {
  const map = {};
  for (const k of Object.keys(row)) {
    map[normalizeKey(k)] = row[k];
  }
  return map;
}

function getFirst(rowMap, choices) {
  for (const c of choices) {
    const v = rowMap[normalizeKey(c)];
    if (v !== undefined && v !== null && (v !== '' || v === 0)) return v;
  }
  return undefined;
}

async function main() {
  try {
    const filePath = process.argv[2] || 'E:\\admin Udrive\\driver list.xlsx';

    if (!fs.existsSync(filePath)) {
      console.error('File not found:', filePath);
      process.exit(1);
    }

    await connectDB();

    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const rows = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: '' });

    if (!rows || rows.length === 0) {
      console.log('No rows found in sheet');
      process.exit(0);
    }

    let created = 0;
    let updated = 0;
    let skipped = 0;

    for (const rawRow of rows) {
      const r = makeRowMap(rawRow);

      const name = getFirst(r, ['name', 'full name', 'driver name']);
      const email = getFirst(r, ['email', 'e-mail', 'email address']);
      const mobile = getFirst(r, ['mobile', 'phone', 'mobile no', 'contact', 'phone number']);
      const aadharNumber = getFirst(r, ['aadhar', 'aadhaar', 'aadhar no', 'aadhar number']);
      const panNumber = getFirst(r, ['pan', 'pan no', 'pan number']);
      const licenseNumber = getFirst(r, ['license no', 'licence no', 'license number', 'licence number']);
      const joinDate = getFirst(r, ['joined', 'join date', 'joining date', 'joined date']);
      const dateOfBirth = getFirst(r, ['dob', 'date of birth', 'dateofbirth']);
      const licenseExpiryDate = getFirst(r, ['license expiry', 'license expiry date', 'license expirydate', 'license expiry date']);
      const licenseClass = getFirst(r, ['license class', 'licence class']);
      // Fleet/vehicle sheet specific fields
      const udbId = getFirst(r, ['udb id', 'udb_id', 'udb']);
      const driverNo = getFirst(r, ['driver no', 'driver no.', 'driver_no', 'driverno', 'driver number']);
      const alternateNo = getFirst(r, ['alternate no', 'alternate number', 'alt no', 'alternate_no', 'alternative no', 'alternative number']);
      const deposit = getFirst(r, ['deposit', 'deposite', 'deposit amount']);
      const address = getFirst(r, ['address', 'addr']);
      const city = getFirst(r, ['city']);
      const state = getFirst(r, ['state']);
      const pincode = getFirst(r, ['pincode', 'pin', 'zip']);
      const planType = getFirst(r, ['plan', 'plan type', 'planType', 'current plan']);
      const experience = getFirst(r, ['experience', 'driving experience']);
      const vehiclePreference = getFirst(r, ['vehicle', 'vehicle preference', 'vehicle type']);
      const bankName = getFirst(r, ['bank', 'bank name']);
      const accountNumber = getFirst(r, ['account no', 'account number']);
      const ifscCode = getFirst(r, ['ifsc', 'ifsc code']);
      const employeeId = getFirst(r, ['employee id', 'employeeid', 'emp id']);

      // Skip rows that have no name and no mobile and no email - likely empty
      if (!name && !mobile && !email && !aadharNumber) {
        skipped++;
        continue;
      }

      // Normalize helpers
      const normalizePhone = (p) => {
        if (!p && p !== 0) return undefined;
        const s = String(p).replace(/\D/g, '').trim();
        return s === '' ? undefined : s;
      };
      const normalizeText = (t) => (t === undefined || t === null) ? undefined : String(t).toString().trim();

      const mobileNorm = normalizePhone(mobile);
      const aadharNorm = aadharNumber ? String(aadharNumber).trim() : undefined;
      const panNorm = panNumber ? String(panNumber).trim().toUpperCase() : undefined;
      const emailNorm = email ? String(email).toLowerCase() : undefined;

      const max = await Driver.find().sort({ id: -1 }).limit(1).lean();
      const nextId = (max[0]?.id || 0) + 1;

      // Helper to convert Excel/strings/numbers into ISO date (YYYY-MM-DD) where possible
      const parseDateValue = (v) => {
        if (!v && v !== 0) return undefined;
        // Handle Excel numeric date serials (e.g., 44500). Excel's serial starts at 1899-12-30; convert to JS date.
        if (typeof v === 'number' && !isNaN(v)) {
          const dt = new Date((v - 25569) * 86400 * 1000);
          if (!isNaN(dt.getTime())) return dt.toISOString().split('T')[0];
        }
        // Strings that are plain numbers may also be Excel serials ("44500"), handle them.
        const sRaw = String(v).trim();
        if (/^\d+(?:\.\d+)?$/.test(sRaw)) {
          const n = parseFloat(sRaw);
          if (!isNaN(n)) {
            const dt = new Date((n - 25569) * 86400 * 1000);
            if (!isNaN(dt.getTime())) return dt.toISOString().split('T')[0];
          }
        }
        if (v instanceof Date && !isNaN(v.getTime())) return v.toISOString().split('T')[0];
        const s = sRaw;
        // Try native Date parse first
        const d = new Date(s);
        if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
        // Try dd/mm/yyyy or dd-mm-yyyy
        const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
        if (m) {
          const [_, dd, mm, yyyy] = m;
          const dt = new Date(`${yyyy}-${mm.padStart(2,'0')}-${dd.padStart(2,'0')}`);
          if (!isNaN(dt.getTime())) return dt.toISOString().split('T')[0];
        }
        return undefined;
      };

      const payload = {
        name: normalizeText(name) || undefined,
        email: emailNorm || undefined,
        mobile: mobileNorm || undefined,
        aadharNumber: aadharNorm || undefined,
        panNumber: panNorm || undefined,
        licenseNumber: licenseNumber ? String(licenseNumber).trim() : undefined,
        licenseExpiryDate: normalizeToDateOnly(licenseExpiryDate),
        dateOfBirth: normalizeToDateOnly(dateOfBirth),
        licenseClass: licenseClass ? String(licenseClass).trim() : undefined,
        joinDate: normalizeToDateOnly(joinDate) || new Date().toISOString().split('T')[0],
        address: address ? String(address).trim() : undefined,
        city: city ? String(city).trim() : undefined,
        state: state ? String(state).trim() : undefined,
        pincode: pincode ? String(pincode).trim() : undefined,
        planType: planType ? String(planType).trim() : undefined,
        experience: experience ? String(experience).trim() : undefined,
        vehiclePreference: vehiclePreference ? String(vehiclePreference).trim() : undefined,
        udbId: udbId ? String(udbId).trim() : undefined,
        driverNo: driverNo ? String(driverNo).trim() : undefined,
        alternateNo: alternateNo ? String(alternateNo).trim() : undefined,
        deposit: deposit ? (Number(String(deposit).replace(/[^0-9\.-]+/g, '')) || undefined) : undefined,
        bankName: bankName ? String(bankName).trim() : undefined,
        accountNumber: accountNumber ? String(accountNumber).trim() : undefined,
        ifscCode: ifscCode ? String(ifscCode).trim() : undefined,
        employeeId: employeeId ? String(employeeId).trim() : undefined,
        isManualEntry: true,
        registrationCompleted: false,
        vehicleAssigned: ''
      };

      // Build search conditions (try multiple fallbacks for phone)
      const conditions = [];
      if (mobileNorm) {
        const last10 = mobileNorm.slice(-10);
        conditions.push({ mobile: mobileNorm });
        conditions.push({ phone: mobileNorm });
        if (last10.length >= 6) {
          conditions.push({ mobile: { $regex: `${last10}$` } });
          conditions.push({ phone: { $regex: `${last10}$` } });
        }
      }
      if (aadharNorm) conditions.push({ aadharNumber: aadharNorm });
      if (panNorm) conditions.push({ panNumber: panNorm });
      if (emailNorm) conditions.push({ email: emailNorm });
      if (employeeId) conditions.push({ employeeId: String(employeeId).trim() });

      // Try to find existing driver
      let existing = null;
      if (conditions.length > 0) {
        existing = await Driver.findOne({ $or: conditions }).lean();
      }

      if (existing) {
        try { await Driver.findByIdAndUpdate(existing._id, { $set: payload }, { new: true }); updated++; }
        catch (err) { console.warn('Failed to update driver', err.message); skipped++; }
      } else {
        const createPayload = { id: nextId, udbId: payload.udbId || `UDB${nextId}`, ...payload };
        try { await Driver.create(createPayload); created++; } catch (err) { console.error('Failed to create driver for row:', rawRow); console.error(err.message); skipped++; }
      }
    }

    console.log('Import completed — created:', created, 'updated:', updated, 'skipped:', skipped);
    process.exit(0);
  } catch (err) {
    console.error('Import failed:', err);
    process.exit(1);
  }
}

main();
