// Utilities to normalize various date representations into YYYY-MM-DD strings
export function normalizeToDateOnly(v) {
  if (v === undefined || v === null || v === '') return undefined;

  // Helper to validate and return YYYY-MM-DD if valid and reasonable
  const toIsoDate = (d) => {
    if (!(d instanceof Date)) d = new Date(d);
    if (isNaN(d.getTime())) return undefined;
    const year = d.getUTCFullYear();
    if (year < 1900 || year > 3000) return undefined; // reject wildly out-of-range dates
    return d.toISOString().split('T')[0];
  };

  // Excel serial -> Date
  const excelSerialToDate = (num) => {
    // Excel's epoch starts at 1899-12-30 in most cases
    const dt = new Date((num - 25569) * 86400 * 1000);
    if (isNaN(dt.getTime())) return undefined;
    return dt;
  };

  // Numbers (possible timestamp or Excel serial)
  if (typeof v === 'number') {
    // Treat values that look like Excel serials (between ~10k and 60k) as serials
    if (v > 10000 && v < 60000) {
      const dt = excelSerialToDate(v);
      const res = toIsoDate(dt);
      if (res) return res;
    }
    // Otherwise try timestamp (ms)
    const res = toIsoDate(new Date(v));
    if (res) return res;
    return undefined;
  }

  const s = String(v).trim();

  // Already in YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const d = new Date(s);
    return toIsoDate(d);
  }

  // Numeric-looking strings (could be Excel serial or timestamp)
  if (/^\d+(?:\.\d+)?$/.test(s)) {
    const n = parseFloat(s);
    if (!isNaN(n)) {
      if (n > 10000 && n < 60000) {
        const dt = excelSerialToDate(n);
        const res = toIsoDate(dt);
        if (res) return res;
      }
      const res2 = toIsoDate(new Date(n));
      if (res2) return res2;
    }
  }

  // Month-name formats like 9-Jan-25, 14-Oct-2025, Jan 9 2025, 9 Jan 25
  const monthRegex1 = /^(\d{1,2})[\s\-\/\.],?\s*([A-Za-z]{3,9})[\s\-\/\.],?\s*(\d{2,4})$/; // e.g. 9-Jan-25 or 9 Jan 2025
  const monthRegex2 = /^([A-Za-z]{3,9})[\s\-\/\.],?\s*(\d{1,2})[\s\-\/\.],?\s*(\d{2,4})$/; // e.g. Jan 9 2025
  let mmMatch;
  if ((mmMatch = s.match(monthRegex1))) {
    let [_, dd, mon, yy] = mmMatch;
    const mIdx = mon.slice(0,3).toLowerCase();
    const months = { jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06', jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12' };
    const mmStr = months[mIdx];
    if (mmStr) {
      if (yy.length === 2) {
        const yNum = Number(yy);
        yy = yNum >= 70 ? String(1900 + yNum) : String(2000 + yNum);
      }
      const candidate = `${yy}-${mmStr}-${String(dd).padStart(2,'0')}`;
      const d = new Date(candidate);
      return toIsoDate(d);
    }
  } else if ((mmMatch = s.match(monthRegex2))) {
    let [_, mon, dd, yy] = mmMatch;
    const mIdx = mon.slice(0,3).toLowerCase();
    const months = { jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06', jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12' };
    const mmStr = months[mIdx];
    if (mmStr) {
      if (yy.length === 2) {
        const yNum = Number(yy);
        yy = yNum >= 70 ? String(1900 + yNum) : String(2000 + yNum);
      }
      const candidate = `${yy}-${mmStr}-${String(dd).padStart(2,'0')}`;
      const d = new Date(candidate);
      return toIsoDate(d);
    }
  }

  // dd/mm/yyyy or dd-mm-yyyy (also support 2-digit years like dd/mm/yy -> assume 20xx up to 69 -> 2069, otherwise 19xx)
  const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (m) {
    let [_, dd, mm, yy] = m;
    if (yy.length === 2) {
      const yNum = Number(yy);
      yy = yNum >= 70 ? String(1900 + yNum) : String(2000 + yNum);
    }
    const candidate = `${yy}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
    const d = new Date(candidate);
    return toIsoDate(d);
  }

  // Last resort: try Date parsing
  const parsed = new Date(s);
  return toIsoDate(parsed);
}
