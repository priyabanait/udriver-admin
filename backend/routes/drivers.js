import express from "express";
import multer from "multer";
import xlsx from "xlsx";
import Driver from "../models/driver.js";
import DriverSignup from "../models/driverSignup.js";
// auth middleware not applied; token used only for login
import { uploadToCloudinary } from "../lib/cloudinary.js";
import { normalizeToDateOnly } from "../lib/dateUtils.js";

const upload = multer({ storage: multer.memoryStorage() });

const router = express.Router();

// Update a driver signup credential
router.put("/signup/credentials/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updated = await DriverSignup.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!updated) {
      return res.status(404).json({ message: "Driver signup not found" });
    }
    res.json(updated);
  } catch (err) {
    console.error("Error updating driver signup:", err);
    res
      .status(400)
      .json({ message: "Failed to update driver signup", error: err.message });
  }
});

// Delete a driver signup credential
router.delete("/signup/credentials/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await DriverSignup.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ message: "Driver signup not found" });
    }
    res.json({ message: "Driver signup deleted", driver: deleted });
  } catch (err) {
    console.error("Error deleting driver signup:", err);
    res
      .status(400)
      .json({ message: "Failed to delete driver signup", error: err.message });
  }
});
// GET driver form data by mobile number
router.get("/form/mobile/:phone", async (req, res) => {
  try {
    const { phone } = req.params;
    const driver = await Driver.findOne({ phone }).lean();
    if (!driver) {
      return res.status(404).json({ error: "Driver not found" });
    }
    // Normalize joinDate on read
    driver.joinDate = normalizeToDateOnly(driver.joinDate) || (driver.createdAt ? new Date(driver.createdAt).toISOString().split('T')[0] : undefined);
    res.json({ driver });
  } catch (error) {
    res
      .status(500)
      .json({ error: "Failed to fetch driver", message: error.message });
  }
});

// GET driver form data by phone/mobile or other identifier (flexible search)
router.get("/form/search/:q", async (req, res) => {
  try {
    const { q } = req.params;
    if (!q) return res.status(400).json({ error: 'Query is required' });

    // If the query looks like a phone, try numeric matching and last-10 fallback
    const normalized = String(q).replace(/\D/g, '').trim();
    const last10 = normalized.slice(-10);

    // Build OR conditions for different identifier types
    const ors = [];
    if (normalized) {
      ors.push({ mobile: normalized });
      ors.push({ phone: normalized });
      if (last10.length >= 6) {
        ors.push({ mobile: { $regex: `${last10}$` } });
        ors.push({ phone: { $regex: `${last10}$` } });
      }
    }

    // Non-numeric identifiers
    const qNormalized = String(q).trim();
    ors.push({ driverNo: qNormalized });
    ors.push({ udbId: qNormalized });
    ors.push({ employeeId: qNormalized });
    ors.push({ aadharNumber: qNormalized });
    ors.push({ panNumber: qNormalized.toUpperCase() });
    ors.push({ email: qNormalized.toLowerCase() });

    const driver = await Driver.findOne({ $or: ors }).lean();

    if (!driver) return res.status(404).json({ error: 'Driver not found' });
    // Normalize joinDate on read
    driver.joinDate = normalizeToDateOnly(driver.joinDate) || (driver.createdAt ? new Date(driver.createdAt).toISOString().split('T')[0] : undefined);
    res.json({ driver });
  } catch (err) {
    console.error('Driver search failed:', err.message);
    res.status(500).json({ error: 'Failed to search driver', message: err.message });
  }
});

// Remove any token/auth-related fields from incoming bodies
function stripAuthFields(source) {
  if (!source || typeof source !== "object") return {};
  const disallowed = new Set([
    "token",
    "authToken",
    "accessToken",
    "authorization",
    "Authorization",
    "bearer",
    "Bearer",
  ]);
  const cleaned = {};
  for (const [k, v] of Object.entries(source)) {
    if (!disallowed.has(k)) cleaned[k] = v;
  }
  return cleaned;
}

// Search drivers endpoint
router.get("/search", async (req, res) => {
  try {
    const {
      q, // general search query
      name,
      email,
      phone,
      mobile,
      username,
      driverNo,
      udbId,
      employeeId,
      aadharNumber,
      panNumber,
      status,
      planType,
      kycStatus,
      city,
      state
    } = req.query;

    const filter = {};

    // General search across multiple fields
    if (q && q.trim()) {
      const searchRegex = new RegExp(q.trim(), 'i');
      const searchRegexUpper = new RegExp(q.trim().toUpperCase(), 'i');
      const normalized = String(q).replace(/\D/g, '').trim();
      const last10 = normalized.slice(-10);
      
      filter.$or = [
        { name: searchRegex },
        { email: searchRegex },
        { username: searchRegex },
        { driverNo: searchRegex },
        { udbId: searchRegex },
        { employeeId: searchRegex },
        { aadharNumber: searchRegex },
        { panNumber: searchRegexUpper }
      ];
      
      // Phone number searches
      if (normalized) {
        filter.$or.push({ mobile: normalized });
        filter.$or.push({ phone: normalized });
        if (last10.length >= 6) {
          filter.$or.push({ mobile: { $regex: `${last10}$` } });
          filter.$or.push({ phone: { $regex: `${last10}$` } });
        }
      }
    }

    // Specific field filters
    if (name) filter.name = new RegExp(name, 'i');
    if (email) filter.email = new RegExp(email, 'i');
    if (phone) {
      const normalized = String(phone).replace(/\D/g, '');
      if (!filter.$or) filter.$or = [];
      filter.$or.push({ phone: normalized });
      filter.$or.push({ mobile: normalized });
    }
    if (mobile) {
      const normalized = String(mobile).replace(/\D/g, '');
      if (!filter.$or) filter.$or = [];
      if (!filter.$or.some(item => item.mobile === normalized)) {
        filter.$or.push({ mobile: normalized });
      }
      if (!filter.$or.some(item => item.phone === normalized)) {
        filter.$or.push({ phone: normalized });
      }
    }
    if (username) filter.username = new RegExp(username, 'i');
    if (driverNo) filter.driverNo = new RegExp(driverNo, 'i');
    if (udbId) filter.udbId = new RegExp(udbId, 'i');
    if (employeeId) filter.employeeId = new RegExp(employeeId, 'i');
    if (aadharNumber) filter.aadharNumber = new RegExp(aadharNumber, 'i');
    if (panNumber) filter.panNumber = panNumber.toUpperCase();
    if (status) filter.status = status;
    if (planType) filter.planType = new RegExp(planType, 'i');
    if (kycStatus) filter.kycStatus = kycStatus;
    if (city) filter.city = new RegExp(city, 'i');
    if (state) filter.state = new RegExp(state, 'i');

    // Pagination
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const requestedLimit = parseInt(req.query.limit) || 10;
    const MIN_LIMIT = 10;
    const MAX_LIMIT = 100;
    const limit = Math.min(Math.max(requestedLimit, MIN_LIMIT), MAX_LIMIT);
    const skip = (page - 1) * limit;

    const sortBy = req.query.sortBy || "createdAt";
    const sortOrder = req.query.sortOrder === "asc" ? 1 : -1;

    const total = await Driver.countDocuments(filter);

    let list = await Driver.find(filter)
      .sort({ [sortBy]: sortOrder })
      .skip(skip)
      .limit(limit)
      .lean();

    list = list.map(item => ({
      ...item,
      joinDate:
        normalizeToDateOnly(item.joinDate) ||
        (item.createdAt
          ? new Date(item.createdAt).toISOString().split("T")[0]
          : undefined),
    }));

    res.json({
      data: list,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasMore: page * limit < total,
      },
    });
  } catch (error) {
    console.error("Error searching drivers:", error);
    res.status(500).json({
      message: "Failed to search drivers",
      error: error.message,
    });
  }
});
router.get("/all", async (req, res) => {
  try {
    const unlimited = req.query.unlimited === "true";

    const page = parseInt(req.query.page) || 1;
    const requestedLimit = parseInt(req.query.limit) || 10;
    const MAX_LIMIT = 1000;

    const limit = unlimited
      ? 0               // MongoDB: limit(0) = no limit
      : Math.min(requestedLimit, MAX_LIMIT);

    const skip = unlimited ? 0 : (page - 1) * limit;

    const sortBy = req.query.sortBy || "createdAt";
    const sortOrder = req.query.sortOrder === "asc" ? 1 : -1;

    const manualOnly = req.query.manualOnly === "true";
    const filter = manualOnly ? { isManualEntry: true } : {};

    const total = await Driver.countDocuments(filter);

    let query = Driver.find(filter)
      .sort({ [sortBy]: sortOrder });

    if (!unlimited) {
      query = query.skip(skip).limit(limit);
    }

    let list = await query.lean();

    list = list.map(item => ({
      ...item,
      joinDate:
        normalizeToDateOnly(item.joinDate) ||
        (item.createdAt
          ? new Date(item.createdAt).toISOString().split("T")[0]
          : undefined),
    }));

    res.json({
      data: list,
      pagination: unlimited
        ? {
            total,
            unlimited: true,
          }
        : {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
            hasMore: page * limit < total,
          },
    });
  } catch (error) {
    console.error("Error fetching drivers:", error);
    res.status(500).json({
      message: "Failed to fetch drivers",
      error: error.message,
    });
  }
});

router.get("/", async (req, res) => {
  try {
    // Enforce pagination - no unlimited option to prevent loading all data
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const requestedLimit = parseInt(req.query.limit) || 10;
    const MIN_LIMIT = 10;
    const MAX_LIMIT = 100; // Reduced max limit for safety

    // Ensure limit is between MIN and MAX
    const limit = Math.min(Math.max(requestedLimit, MIN_LIMIT), MAX_LIMIT);

    const skip = (page - 1) * limit;

    const sortBy = req.query.sortBy || "createdAt";
    const sortOrder = req.query.sortOrder === "asc" ? 1 : -1;

    const manualOnly = req.query.manualOnly === "true";
    const filter = manualOnly ? { isManualEntry: true } : {};

    // Add search support to main GET endpoint
    if (req.query.q && req.query.q.trim()) {
      const searchRegex = new RegExp(req.query.q.trim(), 'i');
      const normalized = String(req.query.q).replace(/\D/g, '').trim();
      const last10 = normalized.slice(-10);
      
      const searchFilter = {
        $or: [
          { name: searchRegex },
          { email: searchRegex },
          { username: searchRegex },
          { driverNo: searchRegex },
          { udbId: searchRegex },
          { employeeId: searchRegex }
        ]
      };
      
      if (normalized) {
        searchFilter.$or.push({ mobile: normalized });
        searchFilter.$or.push({ phone: normalized });
        if (last10.length >= 6) {
          searchFilter.$or.push({ mobile: { $regex: `${last10}$` } });
          searchFilter.$or.push({ phone: { $regex: `${last10}$` } });
        }
      }
      
      filter.$and = filter.$and || [];
      filter.$and.push(searchFilter);
    }

    const total = await Driver.countDocuments(filter);

    let list = await Driver.find(filter)
      .sort({ [sortBy]: sortOrder })
      .skip(skip)
      .limit(limit)
      .lean();

    list = list.map(item => ({
      ...item,
      joinDate:
        normalizeToDateOnly(item.joinDate) ||
        (item.createdAt
          ? new Date(item.createdAt).toISOString().split("T")[0]
          : undefined),
    }));

    res.json({
      data: list,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasMore: page * limit < total,
      },
    });
  } catch (error) {
    console.error("Error fetching drivers:", error);
    res.status(500).json({
      message: "Failed to fetch drivers",
      error: error.message,
    });
  }
});


// GET signup drivers (self-registered with username/mobile/password)
router.get("/signup/credentials", async (req, res) => {
  try {
    // Pagination parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const sortBy = req.query.sortBy || "signupDate";
    const sortOrder = req.query.sortOrder === "asc" ? 1 : -1;

    // Add search support
    const filter = {};
    if (req.query.q && req.query.q.trim()) {
      const searchRegex = new RegExp(req.query.q.trim(), 'i');
      const normalized = String(req.query.q).replace(/\D/g, '').trim();
      
      filter.$or = [
        { username: searchRegex },
        { mobile: searchRegex },
        { status: searchRegex },
        { kycStatus: searchRegex }
      ];
      
      if (normalized) {
        filter.$or.push({ mobile: normalized });
      }
    }

    const total = await DriverSignup.countDocuments(filter);
    const list = await DriverSignup.find(filter)
      .select(
        "username mobile password status kycStatus signupDate registrationCompleted name profilePhoto signature licenseDocument aadharDocument aadharDocumentBack panDocument bankDocument electricBillDocument"
      )
      .sort({ [sortBy]: sortOrder })
      .skip(skip)
      .limit(limit)
      .lean();

    res.json({
      data: list,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasMore: page * limit < total,
      },
    });
  } catch (error) {
    console.error("Error fetching signup credentials:", error);
    res.status(500).json({ message: "Failed to fetch signup credentials" });
  }
});

router.get("/:id", async (req, res) => {
  const id = Number(req.params.id);
  const item = await Driver.findOne({ id }).lean();
  if (!item) return res.status(404).json({ message: "Driver not found" });
  item.joinDate = normalizeToDateOnly(item.joinDate) || (item.createdAt ? new Date(item.createdAt).toISOString().split('T')[0] : undefined);
  res.json(item);
});

// Return the next UDB number to use (e.g., { next: 31, nextUdb: 'UDB0031' })
router.get('/udb/next', async (req, res) => {
  try {
    // find all drivers with udbId that match UDB followed by digits
    const docs = await Driver.find({ udbId: { $exists: true, $ne: null, $regex: '^UDB\\d+$' } }).select('udbId').lean();
    let maxNum = 0;
    for (const d of docs) {
      const m = String(d.udbId).replace(/^UDB0*/, '').replace(/^UDB/, '');
      const n = parseInt(m, 10);
      if (!isNaN(n) && n > maxNum) maxNum = n;
    }
    const defaultStart = 30;
    const next = maxNum === 0 ? defaultStart : maxNum + 1;
    const nextUdb = `UDB${String(next).padStart(4, '0')}`;
    res.json({ next, nextUdb });
  } catch (err) {
    console.error('Failed to compute next UDB:', err);
    res.status(500).json({ error: 'Failed to compute next UDB' });
  }
});

// Import drivers from a spreadsheet (Excel or CSV)
router.post("/import", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    const workbook = xlsx.read(req.file.buffer, { type: "buffer" });
    const sheetNames = workbook.SheetNames || [];
    let created = 0;
    let updated = 0;
    let skipped = 0;

    const normalizePhone = (p) => {
      if (!p && p !== 0) return undefined;
      const s = String(p).replace(/\D/g, "").trim();
      return s === "" ? undefined : s;
    };

    const normalizeText = (t) =>
      t === undefined || t === null ? undefined : String(t).toString().trim();

    const preview = req.query && req.query.preview === "true";
    const perRow = [];

    for (const name of sheetNames) {
      const sheet = workbook.Sheets[name];
      if (!sheet) continue;

      // Use header:1 to get raw arrays and detect header row flexibly
      const rows = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: "" });
      if (!rows || rows.length === 0) continue;

      // Find header row: first row with >=2 non-empty cells
      let headerRowIndex = rows.findIndex(
        (r) =>
          Array.isArray(r) &&
          r.filter((c) => String(c).trim() !== "").length >= 2
      );
      if (headerRowIndex < 0) {
        skipped += rows.length;
        continue;
      }

      const headers = rows[headerRowIndex].map((h) => String(h).trim());
      const dataRows = rows.slice(headerRowIndex + 1);

      const normalizeKey = (k) =>
        String(k || "")
          .trim()
          .toLowerCase();

      const makeMap = (row) => {
        const map = {};
        for (let i = 0; i < headers.length; i++) {
          const hk = normalizeKey(headers[i]);
          map[hk] = row[i] !== undefined && row[i] !== null ? row[i] : "";
        }
        return map;
      };

      const firstOf = (map, choices) => {
        const keys = Object.keys(map || {});
        for (const c of choices) {
          const want = normalizeKey(c);
          // direct key
          if (map[want] !== undefined && String(map[want]).trim() !== "") return String(map[want]).trim();
          // substring match (handles headers like 'profile photo url')
          for (const hk of keys) {
            if ((hk || "").includes(want) && map[hk] !== undefined && String(map[hk]).trim() !== "") {
              return String(map[hk]).trim();
            }
          }
        }
        return undefined;
      };

      for (let rowIndex = 0; rowIndex < dataRows.length; rowIndex++) {
        const r = dataRows[rowIndex];
        if (!Array.isArray(r)) continue;
        const rowMap = makeMap(r);

        const nameV = firstOf(rowMap, ["name", "full name", "driver name"]);
        const emailV = firstOf(rowMap, ["email", "e-mail", "email address"]);
        const mobileRaw = firstOf(rowMap, [
          "mobile",
          "phone",
          "mobile no",
          "contact",
          "phone number",
        ]);
        const mobileV = normalizePhone(mobileRaw);
        const aadharV = firstOf(rowMap, ["aadhar", "aadhaar", "aadhar no"]);
        const panV = firstOf(rowMap, ["pan", "pan no"]);
        const licenseV = firstOf(rowMap, ["license no", "license number"]);
        const empIdV = firstOf(rowMap, ["employee id", "emp id"]);
        const joinV = firstOf(rowMap, ["join date", "joined", "joining date", "joindate", "join"]);
        const dobV = firstOf(rowMap, ["dob", "date of birth", "dateofbirth"]);
        const licenseExpiryV = firstOf(rowMap, ["license expiry", "license expiry date", "license expirydate"]);
        const licenseClassV = firstOf(rowMap, ["license class", "licence class"]);
        const planV = firstOf(rowMap, ["plan", "plan type", "current plan"]);
        const experienceV = firstOf(rowMap, ["experience", "driving experience"]);
        const previousEmploymentV = firstOf(rowMap, ["previous employment", "previous employer", "previous_employment", "previousemployment", "prev employment"]);
        const vehicleV = firstOf(rowMap, ["vehicle", "vehicle preference", "vehicle type"]);
        const udbV = firstOf(rowMap, ["udb id", "udb", "udb_id"]);
        const driverNoV = firstOf(rowMap, ["driver no", "driver no.", "driver number", "driver_no"]);
        const altNoV = firstOf(rowMap, ["alternate no", "alternate number", "alt no", "alternate_no", "alternative no", "alternative number"]);
        const depositV = firstOf(rowMap, ["deposit", "deposite", "deposit amount"]);

        // Additional possible fields exported by front-end CSV
        const usernameV = firstOf(rowMap, ["username", "user name"]);
        const passwordV = firstOf(rowMap, ["password"]);
        const phoneRaw = firstOf(rowMap, ["phone", "phone no", "phone number", "telephone"]);
        // const mobileRaw = firstOf(rowMap, ["mobile", "mobile no", "mobile number", "contact"]);
        const latitudeV = firstOf(rowMap, ["gps latitude", "latitude", "gps lat", "lat"]);
        const longitudeV = firstOf(rowMap, ["gps longitude", "longitude", "gps long", "long", "lng"]);
        const emergencyContactV = firstOf(rowMap, ["emergency contact", "emergency_contact", "emergency name"]);
        const emergencyContactSecondaryV = firstOf(rowMap, ["emergency contact secondary", "emergency contact 2", "emergency_contact_secondary"]);
        const emergencyRelationV = firstOf(rowMap, ["emergency relation", "emergency relation primary"]);
        const emergencyRelationSecondaryV = firstOf(rowMap, ["emergency relation secondary", "emergency relation 2", "relation reference 2", "relation reference2"]);
        const cityV = firstOf(rowMap, ["city", "town", "city name"]);
        const stateV = firstOf(rowMap, ["state", "region", "state name"]);
        const addressV = firstOf(rowMap, ["address", "address1", "address line", "street address"]);
        const pincodeV = firstOf(rowMap, ["pincode", "pin code", "postal code", "zip"]);
        const emergencyPhoneV = firstOf(rowMap, ["emergency phone", "emergency phone no", "emergency phone number"]);
        const emergencyPhoneSecondaryV = firstOf(rowMap, ["emergency phone secondary", "emergency phone 2"]);
        const bankNameV = firstOf(rowMap, ["bank name"]);
        const accountNumberV = firstOf(rowMap, ["account number", "account no", "acc no", "accountnumber"]);
        const ifscV = firstOf(rowMap, ["ifsc", "ifsc code"]);
        const accountHolderV = firstOf(rowMap, ["account holder", "account holder name"]);
        const accountBranchV = firstOf(rowMap, ["branch name", "account branch name", "branch"]);
        const electricBillNoV = firstOf(rowMap, ["electric bill no", "electric bill number", "electricbillno"]);
        // Documents / URLs
        const profilePhotoV = firstOf(rowMap, ["profile photo", "profilephoto", "photo", "profile_photo"]);
        const licenseDocumentV = firstOf(rowMap, ["license document", "license doc", "license_document"]);
        const aadharDocumentV = firstOf(rowMap, [
          "aadhar document",
          "aadhar doc",
          "aadhar_document",
          "aadhar front",
          "aadhar front url",
          "aadhar front document",
          "aadhaar front",
          "aadhar front image",
        ]);
        const aadharDocumentBackV = firstOf(rowMap, ["aadhar back", "aadhar back document", "aadhar document back"]);
        const panDocumentV = firstOf(rowMap, ["pan document", "pan doc", "pan_document"]);
        const bankDocumentV = firstOf(rowMap, ["bank document", "bank doc", "bank_document"]);
        const electricBillDocumentV = firstOf(rowMap, ["electric bill document", "electric bill doc", "electricbilldocument"]);

        if (!nameV && !mobileV && !emailV && !aadharV) {
          skipped++;
          perRow.push({ rowIndex, reason: "no identifiers" });
          continue;
        }

        // Build search conditions (try multiple fallbacks for phone)
        const conditions = [];
        if (mobileV) {
          const last10 = mobileV.slice(-10);
          conditions.push({ mobile: mobileV });
          conditions.push({ phone: mobileV });
          if (last10.length >= 6) {
            conditions.push({ mobile: { $regex: `${last10}$` } });
            conditions.push({ phone: { $regex: `${last10}$` } });
          }
        }
        if (aadharV) conditions.push({ aadharNumber: normalizeText(aadharV) });
        if (panV)
          conditions.push({ panNumber: normalizeText(panV).toUpperCase() });
        if (emailV) conditions.push({ email: String(emailV).toLowerCase() });
        if (empIdV) conditions.push({ employeeId: normalizeText(empIdV) });

        const max = await Driver.find().sort({ id: -1 }).limit(1).lean();
        const nextId = (max[0]?.id || 0) + 1;

        // Try to parse dates from strings or Date objects into YYYY-MM-DD
        const parseDateValue = (v) => {
          if (!v && v !== 0) return undefined;
          if (v instanceof Date && !isNaN(v.getTime())) return v.toISOString().split('T')[0];
          const s = String(v).trim();
          const d = new Date(s);
          if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
          const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
          if (m) {
            const [_, dd, mm, yyyy] = m;
            const dt = new Date(`${yyyy}-${mm.padStart(2,'0')}-${dd.padStart(2,'0')}`);
            if (!isNaN(dt.getTime())) return dt.toISOString().split('T')[0];
          }
          return undefined;
        };

        const payload = {
          username: usernameV ? String(usernameV).trim() : undefined,
          password: passwordV ? String(passwordV) : undefined,
          name: normalizeText(nameV) || undefined,
          email: emailV ? String(emailV).toLowerCase() : undefined,
          phone: phoneRaw ? normalizePhone(phoneRaw) : (mobileV || undefined),
          mobile: mobileV || undefined,
          address: addressV ? String(addressV).trim() : undefined,
          latitude: latitudeV ? String(latitudeV).trim() : undefined,
          longitude: longitudeV ? String(longitudeV).trim() : undefined,
          city: cityV ? String(cityV).trim() : undefined,
          state: stateV ? String(stateV).trim() : undefined,
          pincode: pincodeV ? String(pincodeV).trim() : undefined,
          aadharNumber: aadharV ? String(aadharV).trim() : undefined,
          panNumber: panV ? String(panV).trim().toUpperCase() : undefined,
          electricBillNo: electricBillNoV ? String(electricBillNoV).trim() : undefined,
          licenseNumber: licenseV ? String(licenseV).trim() : undefined,
          licenseExpiryDate: normalizeToDateOnly(licenseExpiryV),
          dateOfBirth: normalizeToDateOnly(dobV),
          joinDate: normalizeToDateOnly(joinV) || new Date().toISOString().split('T')[0],
          licenseClass: licenseClassV ? String(licenseClassV).trim() : undefined,
          planType: planV ? String(planV).trim() : undefined,
          experience: experienceV ? String(experienceV).trim() : undefined,
          previousEmployment: previousEmploymentV ? String(previousEmploymentV).trim() : undefined,
          vehiclePreference: vehicleV ? String(vehicleV).trim() : undefined,
          udbId: (() => {
            if (!udbV && udbV !== 0) return undefined;
            let s = String(udbV).trim();
            // If value is purely digits, prefix with UDB
            if (/^\d+$/.test(s)) s = `UDB${s}`;
            // Keep existing UDB prefix but normalize to upper-case
            if (/^udb/i.test(s)) s = s.toUpperCase();
            return s || undefined;
          })(),
          driverNo: driverNoV ? String(driverNoV).trim() : undefined,
          alternateNo: altNoV ? String(altNoV).trim() : undefined,
          deposit: depositV ? (Number(String(depositV).replace(/[^0-9\.-]+/g, '')) || undefined) : undefined,
          employeeId: empIdV ? String(empIdV).trim() : undefined,

          // Emergency + contact details
          emergencyContact: emergencyContactV ? String(emergencyContactV).trim() : undefined,
          emergencyContactSecondary: emergencyContactSecondaryV ? String(emergencyContactSecondaryV).trim() : undefined,
          emergencyRelation: emergencyRelationV ? String(emergencyRelationV).trim() : undefined,
          emergencyRelationSecondary: emergencyRelationSecondaryV ? String(emergencyRelationSecondaryV).trim() : undefined,
          emergencyPhone: emergencyPhoneV ? String(emergencyPhoneV).trim() : undefined,
          emergencyPhoneSecondary: emergencyPhoneSecondaryV ? String(emergencyPhoneSecondaryV).trim() : undefined,

          // Bank details
          bankName: bankNameV ? String(bankNameV).trim() : undefined,
          accountNumber: accountNumberV ? String(accountNumberV).trim() : undefined,
          ifscCode: ifscV ? String(ifscV).trim() : undefined,
          accountHolderName: accountHolderV ? String(accountHolderV).trim() : undefined,
          accountBranchName: accountBranchV ? String(accountBranchV).trim() : undefined,

          // Documents / URLs
          profilePhoto: profilePhotoV ? String(profilePhotoV).trim() : undefined,
          licenseDocument: licenseDocumentV ? String(licenseDocumentV).trim() : undefined,
          aadharDocument: aadharDocumentV ? String(aadharDocumentV).trim() : undefined,
          aadharDocumentBack: aadharDocumentBackV ? String(aadharDocumentBackV).trim() : undefined,
          panDocument: panDocumentV ? String(panDocumentV).trim() : undefined,
          bankDocument: bankDocumentV ? String(bankDocumentV).trim() : undefined,
          electricBillDocument: electricBillDocumentV ? String(electricBillDocumentV).trim() : undefined,

          isManualEntry: true,
          registrationCompleted: false,
          vehicleAssigned: '',
        };

        // Debug: log document fields parsed from spreadsheet (helps verify import captures URLs)
        try {
          console.debug && console.debug('IMPORT ROW payload docs', {
            profilePhoto: payload.profilePhoto,
            licenseDocument: payload.licenseDocument,
            aadharDocument: payload.aadharDocument,
            aadharDocumentBack: payload.aadharDocumentBack,
            panDocument: payload.panDocument,
            bankDocument: payload.bankDocument,
            electricBillDocument: payload.electricBillDocument,
          });
        } catch (e) {
          /* ignore logging errors */
        }

        // Try to find an existing driver using any condition
        let existing = null;
        if (conditions.length > 0) {
          existing = await Driver.findOne({ $or: conditions }).lean();
        }

        const rowResult = {
          rowIndex,
          name: payload.name || null,
          mobile: payload.mobile || null,
          email: payload.email || null,
          aadhar: payload.aadharNumber || null,
          udbId: payload.udbId || null,
          driverNo: payload.driverNo || null,
          alternateNo: payload.alternateNo || null,
          deposit: payload.deposit || null
        };

        if (preview) {
          rowResult.found = !!existing;
          if (existing) {
            // try detect matchedBy
            const last10 = mobileV ? mobileV.slice(-10) : null;
            if (
              mobileV &&
              (existing.mobile === mobileV ||
                existing.phone === mobileV ||
                (last10 &&
                  (String(existing.mobile || "").endsWith(last10) ||
                    String(existing.phone || "").endsWith(last10))))
            )
              rowResult.matchedBy = "mobile";
            else if (
              aadharV &&
              existing.aadharNumber === String(aadharV).trim()
            )
              rowResult.matchedBy = "aadhar";
            else if (emailV && existing.email === String(emailV).toLowerCase())
              rowResult.matchedBy = "email";
            else if (empIdV && existing.employeeId === String(empIdV).trim())
              rowResult.matchedBy = "employeeId";
            else rowResult.matchedBy = "unknown";
          }
          perRow.push(rowResult);
        } else {
          if (existing) {
            try {
              await Driver.findByIdAndUpdate(
                existing._id,
                { $set: payload },
                { new: true }
              );
              updated++;
            } catch (err) {
              console.warn("Failed to update driver", err.message);
              skipped++;
              rowResult.error = err.message;
              perRow.push(rowResult);
            }
          } else {
            const createPayload = { id: nextId, ...payload };
            try {
              await Driver.create(createPayload);
              created++;
              perRow.push({ ...rowResult, created: true });
            } catch (err) {
              console.warn("Failed to create driver for row", err.message);
              skipped++;
              rowResult.error = err.message;
              perRow.push(rowResult);
            }
          }
        }
      }
    }

    if (preview) {
      return res.json({
        message: "Preview completed",
        sheetNames,
        results: perRow,
        created,
        updated,
        skipped,
      });
    }

    if (created === 0 && updated === 0 && skipped > 0) {
      return res
        .status(400)
        .json({
          message: "No parsable data found in file sheets",
          sheetNames,
          created,
          updated,
          skipped,
        });
    }
    return res.json({ message: "Import completed", created, updated, skipped });
  } catch (err) {
    console.error("Import failed:", err);
    res.status(500).json({ message: "Import failed", error: err.message });
  }
});

// Create new driver with document uploads (or complete registration for existing driver)
router.post("/", async (req, res) => {
  try {
    const fields = stripAuthFields(req.body);
    // Determine next id only when creating a new driver
    const max = await Driver.find().sort({ id: -1 }).limit(1).lean();
    const nextId = (max[0]?.id || 0) + 1;

    // Document fields we expect
    const documentFields = [
      "profilePhoto",
      "signature",
      "licenseDocument",
      "aadharDocument",
      "aadharDocumentBack",
      "panDocument",
      "bankDocument",
      "electricBillDocument",
    ];

    // If mobile provided, check if a Driver already exists. If yes, we'll update instead of creating a duplicate.
    let existingDriver = null;
    if (fields.mobile) {
      existingDriver = await Driver.findOne({ mobile: fields.mobile }).lean();
    }

    // Use target id for uploads: existing driver's id if updating, otherwise nextId
    const targetId = existingDriver ? existingDriver.id : nextId;

    // Handle document uploads to Cloudinary (use targetId in path)
    const uploadedDocs = {};
    for (const field of documentFields) {
      if (
        fields[field] &&
        typeof fields[field] === "string" &&
        fields[field].startsWith("data:")
      ) {
        try {
          const result = await uploadToCloudinary(
            fields[field],
            `drivers/${targetId}/${field}`
          );
          uploadedDocs[field] = result.secure_url;
        } catch (uploadErr) {
          console.error(`Failed to upload ${field}:`, uploadErr);
        }
      }
    }

    // Build update/create payload
    const baseData = {
      ...fields,
      ...uploadedDocs,
      emergencyContactSecondary: fields.emergencyContactSecondary || "",
      emergencyRelation: fields.emergencyRelation || "",
      emergencyRelationSecondary: fields.emergencyRelationSecondary || "",
      emergencyPhoneSecondary: fields.emergencyPhoneSecondary || "",
    };

    // If there is a DriverSignup for this mobile, mark registration complete there and copy any missing docs
    let signupDoc = null;
    if (baseData.mobile) {
      signupDoc = await DriverSignup.findOneAndUpdate(
        { mobile: baseData.mobile },
        { registrationCompleted: true, status: "active" },
        { new: true }
      ).lean();
      if (signupDoc) {
        for (const f of documentFields) {
          if (!baseData[f] && signupDoc[f]) baseData[f] = signupDoc[f];
        }
      }
    }

    // Remove raw base64 data from payload
    documentFields.forEach((field) => {
      if (baseData[field]?.startsWith && baseData[field].startsWith("data:")) {
        delete baseData[field];
      }
    });

    // If a Driver with same mobile exists -> update it (complete registration)
    if (existingDriver) {
      const updateData = {
        ...existingDriver,
        ...baseData,
        registrationCompleted: true,
        // If signup exists, mark that this was a self-registration completion
        isManualEntry: signupDoc ? false : existingDriver.isManualEntry,
      };

      // Normalize joinDate if present in update
      if (updateData.joinDate) updateData.joinDate = normalizeToDateOnly(updateData.joinDate) || updateData.joinDate;

      try {
        const updated = await Driver.findOneAndUpdate(
          { mobile: baseData.mobile },
          updateData,
          { new: true }
        ).lean();

        if (!updated) {
          return res.status(404).json({ message: "Driver not found to update" });
        }

        // Notify the driver that their registration is pending approval (if signup exists)
        if (signupDoc && signupDoc._id) {
          try {
            const { createAndEmitNotification } = await import("../lib/notify.js");
            await createAndEmitNotification({
              type: "driver_registration_completed",
              title: `Registration Submitted`,
              message: `Your registration is pending approval. We'll notify you once it's reviewed.`,
              data: { id: updated._id, driverId: updated.id },
              recipientType: "driver",
              // Use the actual Driver _id so FCM finds the correct device tokens
              recipientId: String(updated._id),
            });
          } catch (err) {
            console.warn("Notify failed:", err.message);
          }
        }

        return res.json(updated);
      } catch (err) {
        console.warn("Failed to update driver", err.message);
        return res.status(500).json({ message: "Failed to update driver", error: err.message });
      }
    }

    // Otherwise create a new driver (admin flow)
    const driverData = {
      id: nextId,
      ...baseData,
      isManualEntry: signupDoc ? false : true,
      registrationCompleted: true,
    };

    // Normalize joinDate if present
    driverData.joinDate = normalizeToDateOnly(driverData.joinDate) || new Date().toISOString().split('T')[0];

    const created = await Driver.create(driverData);

    // Notify admins and the driver (if signup exists)
    try {
      const { createAndEmitNotification } = await import("../lib/notify.js");
      await createAndEmitNotification({
        type: "driver_added",
        title: `Driver added: ${
          created.name || created.mobile || created.username || "N/A"
        }`,
        message: `Admin has added a new driver with ID: ${
          created.id || created._id
        }`,
        data: { id: created._id, driverId: created.id, mobile: created.mobile },
        recipientType: "admin",
        recipientId: null,
      });

      if (created.mobile && signupDoc && signupDoc._id) {
        await createAndEmitNotification({
          type: "driver_added",
          title: `Your profile has been created`,
          message: `Admin has created your driver profile. Your ID is ${
            created.id || created._id
          }`,
          data: { id: created._id, driverId: created.id },
          recipientType: "driver",
          // Use the actual newly-created Driver _id so FCM targets the correct device tokens
          recipientId: String(created._id),
        });
      }
    } catch (err) {
      console.warn("Notify failed:", err.message);
    }

    res.status(201).json(created);
  } catch (err) {
    console.error("Driver create error:", err);
    // If duplicate key error slips through, try to return a helpful message instead of crashing
    if (err && err.code === 11000) {
      return res
        .status(409)
        .json({
          message: "Driver with this mobile already exists",
          error: err.message,
        });
    }
    res
      .status(500)
      .json({ message: "Failed to create/update driver", error: err.message });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const fields = stripAuthFields(req.body);

    // If signature or document fields are missing, try to copy from corresponding DriverSignup
    const documentFields = [
      "profilePhoto",
      "signature",
      "licenseDocument",
      "aadharDocument",
      "aadharDocumentBack",
      "panDocument",
      "bankDocument",
      "electricBillDocument",
    ];
    if (fields.mobile) {
      const signup = await DriverSignup.findOne({
        mobile: fields.mobile,
      }).lean();
      if (signup) {
        for (const f of documentFields) {
          if (!fields[f] && signup[f]) fields[f] = signup[f];
        }
      }
    }

    // Handle document uploads to Cloudinary
    const uploadedDocs = {};

    for (const field of documentFields) {
      if (fields[field] && fields[field].startsWith("data:")) {
        try {
          const result = await uploadToCloudinary(
            fields[field],
            `drivers/${id}/${field}`
          );
          uploadedDocs[field] = result.secure_url;
        } catch (uploadErr) {
          console.error(`Failed to upload ${field}:`, uploadErr);
        }
      }
    }

    // Add emergency contact relation and secondary phone
    const updateData = {
      ...fields,
      ...uploadedDocs,
      emergencyContactSecondary: fields.emergencyContactSecondary || "",
      emergencyRelation: fields.emergencyRelation || "",
      emergencyRelationSecondary: fields.emergencyRelationSecondary || "",
      emergencyPhoneSecondary: fields.emergencyPhoneSecondary || "",
    };

    // Remove base64 data to prevent large document size
    documentFields.forEach((field) => {
      if (updateData[field]?.startsWith("data:")) {
        delete updateData[field];
      }
    });

    // Normalize joinDate if present
    if (updateData.joinDate) updateData.joinDate = normalizeToDateOnly(updateData.joinDate) || updateData.joinDate;

    const updated = await Driver.findOneAndUpdate({ id }, updateData, {
      new: true,
    }).lean();

    if (!updated) {
      return res.status(404).json({ message: "Driver not found" });
    }

    res.json(updated);
  } catch (err) {
    console.error("Driver update error:", err);
    res
      .status(500)
      .json({ message: "Failed to update driver", error: err.message });
  }
});

router.delete("/:id", async (req, res) => {
  const id = Number(req.params.id);
  await Driver.deleteOne({ id });
  res.json({ message: "Deleted" });
});

// GET driver earnings summary
router.get("/earnings/summary", async (req, res) => {
  try {
    // Mock driver earnings data (replace with actual calculation from trips/payments)
    const driverEarnings = [
      {
        driverId: "DR001",
        driverName: "Rajesh Kumar",
        monthlyEarnings: 52000,
        totalTrips: 180,
        averageRating: 4.7,
        totalDistance: 1800,
        pendingAmount: 0,
        lastPayment: "2024-11-01",
      },
      {
        driverId: "DR002",
        driverName: "Priya Sharma",
        monthlyEarnings: 65000,
        totalTrips: 220,
        averageRating: 4.9,
        totalDistance: 2200,
        pendingAmount: 15725,
        lastPayment: "2024-10-25",
      },
      {
        driverId: "DR003",
        driverName: "Amit Singh",
        monthlyEarnings: 48000,
        totalTrips: 160,
        averageRating: 4.5,
        totalDistance: 1600,
        pendingAmount: 5000,
        lastPayment: "2024-11-02",
      },
      {
        driverId: "DR004",
        driverName: "Sunita Patel",
        monthlyEarnings: 42000,
        totalTrips: 145,
        averageRating: 4.6,
        totalDistance: 1450,
        pendingAmount: 10200,
        lastPayment: "2024-10-28",
      },
      {
        driverId: "DR005",
        driverName: "Vikram Reddy",
        monthlyEarnings: 58000,
        totalTrips: 195,
        averageRating: 4.8,
        totalDistance: 1950,
        pendingAmount: 0,
        lastPayment: "2024-11-03",
      },
    ];

    res.json(driverEarnings);
  } catch (err) {
    console.error("Error fetching driver earnings:", err);
    res
      .status(500)
      .json({ message: "Failed to fetch driver earnings", error: err.message });
  }
});

export default router;
