import express from 'express';
import Vehicle from '../models/vehicle.js';
// auth middleware not applied; token used only for login
import { uploadToCloudinary } from '../lib/cloudinary.js';

const router = express.Router();

// Remove any token/auth-related fields from incoming bodies
function stripAuthFields(source) {
  if (!source || typeof source !== 'object') return {};
  const disallowed = new Set(['token', 'authToken', 'accessToken', 'authorization', 'Authorization', 'bearer', 'Bearer']);
  const cleaned = {};
  for (const [k, v] of Object.entries(source)) {
    if (!disallowed.has(k)) cleaned[k] = v;
  }
  return cleaned;
}

// Normalize vehicle object to always include expected keys so clients "see all data"
function normalizeVehicleShape(v) {
  const base = {
    // identity
    vehicleId: null,
    registrationNumber: '',

    // primary details
    category: '',
    brand: '',
    model: '',
    carName: '',
    color: '',
    fuelType: '',
    investorId: v?.investorId ?? null,
    ownerName: '',
    ownerPhone: '',
    year: null,
    manufactureYear: v?.manufactureYear ?? null,

    // dates and numbers
    registrationDate: '',
    rcExpiryDate: '',
    roadTaxDate: '',
    roadTaxNumber: '',
    insuranceDate: '',
    permitDate: '',
    emissionDate: '',
    pucNumber: '',
    trafficFine: v?.trafficFine ?? null,
    trafficFineDate: v?.trafficFineDate ?? '',

    // status
    status: v?.status ?? 'inactive',
    kycStatus: v?.kycStatus ?? 'pending',
    assignedDriver: '',
    remarks: v?.remarks ?? '',
    kycVerifiedDate: v?.kycVerifiedDate ?? null,

    // legacy docs
    insuranceDoc: null,
    rcDoc: null,
    permitDoc: null,
    pollutionDoc: null,
    fitnessDoc: null,

    // new photos
    registrationCardPhoto: null,
    roadTaxPhoto: null,
    pucPhoto: null,
    permitPhoto: null,
    fcPhoto: null,
    carFrontPhoto: null,
    carLeftPhoto: null,
    carRightPhoto: null,
    carBackPhoto: null,
    carFullPhoto: null,
    // new fields: insurance, interior, speedometer
    insurancePhoto: null,
    interiorPhoto: null,
    speedometerPhoto: null,

    // misc
    make: v?.make ?? '',
    purchaseDate: v?.purchaseDate ?? '',
    purchasePrice: v?.purchasePrice ?? null,
    currentValue: v?.currentValue ?? null,
    mileage: v?.mileage ?? null,
    lastService: v?.lastService ?? '',
    nextService: v?.nextService ?? '',

    // New fields: date tracking and uploaded document
    startDate: v?.startDate ?? null,
    endDate: v?.endDate ?? null,
    paymentDate: v?.paymentDate ?? null,
    paymentDoc: v?.paymentDoc ?? null,
    attachmentUrl: v?.attachmentUrl ?? null,
    attachmentName: v?.attachmentName ?? null
  };

  // Merge existing doc over defaults
  return { ...base, ...(v || {}) };
}

// Search/filter vehicles
router.get('/search', async (req, res) => {
  try {
    const {
      q, // general search query
      registrationNumber,
      brand,
      category,
      model,
      carName,
      color,
      fuelType,
      ownerName,
      ownerPhone,
      status,
      kycStatus,
      assignedDriver,
      assignedManager,
      minYear,
      maxYear
    } = req.query;

    const filter = {};

    // General search across multiple fields
    if (q && q.trim()) {
      const searchRegex = new RegExp(q.trim(), 'i');
      filter.$or = [
        { registrationNumber: searchRegex },
        { brand: searchRegex },
        { category: searchRegex },
        { model: searchRegex },
        { carName: searchRegex },
        { ownerName: searchRegex },
        { ownerPhone: searchRegex },
        { assignedDriver: searchRegex }
      ];
    }

    // Specific field filters
    if (registrationNumber) filter.registrationNumber = new RegExp(registrationNumber, 'i');
    if (brand) filter.brand = new RegExp(brand, 'i');
    if (category) filter.category = new RegExp(category, 'i');
    if (model) filter.model = new RegExp(model, 'i');
    if (carName) filter.carName = new RegExp(carName, 'i');
    if (color) filter.color = new RegExp(color, 'i');
    if (fuelType) filter.fuelType = new RegExp(fuelType, 'i');
    if (ownerName) filter.ownerName = new RegExp(ownerName, 'i');
    if (ownerPhone) filter.ownerPhone = new RegExp(ownerPhone, 'i');
    if (status) filter.status = status;
    if (kycStatus) filter.kycStatus = kycStatus;
    if (assignedDriver) filter.assignedDriver = new RegExp(assignedDriver, 'i');
    if (assignedManager) filter.assignedManager = new RegExp(assignedManager, 'i');

    // Year range filter
    if (minYear || maxYear) {
      filter.year = {};
      if (minYear) filter.year.$gte = Number(minYear);
      if (maxYear) filter.year.$lte = Number(maxYear);
    }

    const vehicles = await Vehicle.find(filter).lean();
    
    // Fetch all drivers for lookup
    const Driver = (await import('../models/driver.js')).default;
    const mongoose = await import('mongoose');
    const allDrivers = await Driver.find().select('_id id name username mobile phone').lean();
    
    const vehiclesWithDriverInfo = vehicles.map(vehicle => {
      // Resolve assignedDriver to driver info if it's an ObjectId or matches driver fields
      let driverInfo = null;
      if (vehicle.assignedDriver) {
        // Try to match by ObjectId
        if (mongoose.default.Types.ObjectId.isValid(vehicle.assignedDriver)) {
          driverInfo = allDrivers.find(d => String(d._id) === String(vehicle.assignedDriver));
        }
        // If not found, try to match by mobile, phone, or username
        if (!driverInfo) {
          driverInfo = allDrivers.find(d => 
            d.mobile === vehicle.assignedDriver ||
            d.phone === vehicle.assignedDriver ||
            d.username === vehicle.assignedDriver ||
            String(d.id) === String(vehicle.assignedDriver)
          );
        }
        // If driver found, add driver info to vehicle
        if (driverInfo) {
          vehicle.driverDetails = {
            name: driverInfo.name || driverInfo.username || driverInfo.mobile || driverInfo.phone,
            mobile: driverInfo.mobile || driverInfo.phone,
            id: driverInfo._id || driverInfo.id
          };
        }
      }
      return normalizeVehicleShape(vehicle);
    });
    
    res.json(vehiclesWithDriverInfo);
  } catch (err) {
    console.error('Error searching vehicles:', err);
    res.status(500).json({ message: 'Failed to search vehicles' });
  }
});

// Get vehicles by investorId
router.get('/investor/:investorId', async (req, res) => {
  try {
    const { investorId } = req.params;
    const vehicles = await Vehicle.find({ investorId }).populate('investorId', 'investorName phone email').lean();
    res.json(vehicles.map(normalizeVehicleShape));
  } catch (err) {
    console.error('Error fetching vehicles for investor:', err);
    res.status(500).json({ message: 'Failed to fetch vehicles for investor' });
  }
});
router.get('/all', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limitParam = req.query.limit;

    const isUnlimited = limitParam === 'all' || limitParam === '0';
    const limit = isUnlimited ? 0 : parseInt(limitParam) || 10;
    const skip = isUnlimited ? 0 : (page - 1) * limit;

    const sortBy = req.query.sortBy || 'vehicleId';
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;

    const total = await Vehicle.countDocuments();

    let query = Vehicle.find()
      .populate('investorId', 'investorName phone email')
      .sort({ [sortBy]: sortOrder });

    if (!isUnlimited) {
      query = query.skip(skip).limit(limit);
    }

    const list = await query.lean();

    const enhancedList = list.map(vehicle => {
      const normalized = normalizeVehicleShape(vehicle);
      const status = normalized.status || 'inactive';

      let calculatedMonths = 0;
      if (Array.isArray(normalized.rentPeriods) && status === 'active') {
        normalized.rentPeriods.forEach(period => {
          const start = new Date(period.start);
          const end = period.end ? new Date(period.end) : new Date();
          const diffDays = Math.floor((end - start) / (1000 * 60 * 60 * 24));
          calculatedMonths += Math.floor(diffDays / 30) + 1;
        });
      }

      const monthlyProfitMin = normalized.monthlyProfitMin || 0;

      return {
        ...normalized,
        calculatedMonths,
        cumulativePayout: monthlyProfitMin * calculatedMonths,
        isActive: status === 'active',
        hasRentPeriods: Array.isArray(normalized.rentPeriods)
      };
    });

    res.json({
      data: enhancedList,
      pagination: isUnlimited
        ? null
        : {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
            hasMore: page * limit < total
          }
    });
  } catch (err) {
    console.error('Error fetching vehicles:', err);
    res.status(500).json({ message: 'Failed to fetch vehicles' });
  }
});

// Get all vehicles
router.get('/', async (req, res) => {
  try {
    // Enforce pagination - no unlimited option to prevent loading all data
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const requestedLimit = parseInt(req.query.limit) || 10;
    const MIN_LIMIT = 10;
    const MAX_LIMIT = 100; // Reduced max limit for safety

    // Ensure limit is between MIN and MAX
    const limit = Math.min(Math.max(requestedLimit, MIN_LIMIT), MAX_LIMIT);
    const skip = (page - 1) * limit;

    const sortBy = req.query.sortBy || 'vehicleId';
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;

    const total = await Vehicle.countDocuments();

    const list = await Vehicle.find()
      .populate('investorId', 'investorName phone email')
      .sort({ [sortBy]: sortOrder })
      .skip(skip)
      .limit(limit)
      .lean();

    // Fetch all drivers for lookup
    const Driver = (await import('../models/driver.js')).default;
    const mongoose = await import('mongoose');
    const allDrivers = await Driver.find().select('_id id name username mobile phone').lean();

    const enhancedList = list.map(vehicle => {
      // Resolve assignedDriver to driver info if it's an ObjectId or matches driver fields
      if (vehicle.assignedDriver) {
        let driverInfo = null;
        // Try to match by ObjectId
        if (mongoose.default.Types.ObjectId.isValid(vehicle.assignedDriver)) {
          driverInfo = allDrivers.find(d => String(d._id) === String(vehicle.assignedDriver));
        }
        // If not found, try to match by mobile, phone, or username
        if (!driverInfo) {
          driverInfo = allDrivers.find(d => 
            d.mobile === vehicle.assignedDriver ||
            d.phone === vehicle.assignedDriver ||
            d.username === vehicle.assignedDriver ||
            String(d.id) === String(vehicle.assignedDriver)
          );
        }
        // If driver found, add driver info to vehicle
        if (driverInfo) {
          vehicle.driverDetails = {
            name: driverInfo.name || driverInfo.username || driverInfo.mobile || driverInfo.phone,
            mobile: driverInfo.mobile || driverInfo.phone,
            id: driverInfo._id || driverInfo.id
          };
        }
      }
      
      const normalized = normalizeVehicleShape(vehicle);
      const status = normalized.status || 'inactive';

      let calculatedMonths = 0;
      if (Array.isArray(normalized.rentPeriods) && status === 'active') {
        normalized.rentPeriods.forEach(period => {
          const start = new Date(period.start);
          const end = period.end ? new Date(period.end) : new Date();
          const diffDays = Math.floor((end - start) / (1000 * 60 * 60 * 24));
          calculatedMonths += Math.floor(diffDays / 30) + 1;
        });
      }

      const monthlyProfitMin = normalized.monthlyProfitMin || 0;

      return {
        ...normalized,
        calculatedMonths,
        cumulativePayout: monthlyProfitMin * calculatedMonths,
        isActive: status === 'active',
        hasRentPeriods: Array.isArray(normalized.rentPeriods)
      };
    });

    res.json({
      data: enhancedList,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasMore: page * limit < total
      }
    });
  } catch (err) {
    console.error('Error fetching vehicles:', err);
    res.status(500).json({ message: 'Failed to fetch vehicles' });
  }
});


// Get a single vehicle by ID
router.get('/:id', async (req, res) => {
  try {
    const vehicleId = Number(req.params.id);
    const vehicle = await Vehicle.findOne({ vehicleId }).populate('investorId', 'investorName phone email').lean();
    if (!vehicle) {
      return res.status(404).json({ message: 'Vehicle not found' });
    }
    res.json(normalizeVehicleShape(vehicle));
  } catch (err) {
    console.error('Error fetching vehicle:', err);
    res.status(500).json({ message: 'Failed to fetch vehicle' });
  }
});

// Create a new vehicle
router.post('/', async (req, res) => {
  try {
    if (!req.body.registrationNumber) {
      return res.status(400).json({ message: 'Registration number is required' });
    }

    const body = stripAuthFields(req.body);
    let vehicleData = {
      status: 'inactive',
      kycStatus: 'pending',
      ...body
    };

    // Normalize and coerce basic types
    vehicleData.registrationNumber = (vehicleData.registrationNumber || '').toString().trim();
    if (vehicleData.year != null) vehicleData.year = Number(vehicleData.year);
    if (vehicleData.trafficFine != null) vehicleData.trafficFine = Number(vehicleData.trafficFine);
    
    // Handle investorId - convert to ObjectId if provided
    if (vehicleData.investorId) {
      const mongoose = await import('mongoose');
      if (mongoose.default.Types.ObjectId.isValid(vehicleData.investorId)) {
        vehicleData.investorId = new mongoose.default.Types.ObjectId(vehicleData.investorId);
      } else {
        delete vehicleData.investorId; // Invalid ObjectId, remove it
      }
    }

    // Normalize category and carCategory to match investment entry carnames
    try {
      const CarInvestmentEntry = (await import('../models/carInvestmentEntry.js')).default;
      const entries = await CarInvestmentEntry.find();
      const entryNames = entries.map(e => (e.carname || '').trim().toLowerCase());
      let cat = (vehicleData.category || '').trim().toLowerCase();
      let carCat = (vehicleData.carCategory || '').trim().toLowerCase();
      let match = entryNames.find(name => name === cat) || entryNames.find(name => name === carCat);
      if (!match) {
        // Try to auto-correct using closest match (startsWith)
        let suggestion = entryNames.find(name => cat && name.startsWith(cat.slice(0, 3))) || entryNames.find(name => carCat && name.startsWith(carCat.slice(0, 3)));
        if (suggestion) {
          if (cat && !entryNames.includes(cat)) vehicleData.category = suggestion;
          if (carCat && !entryNames.includes(carCat)) vehicleData.carCategory = suggestion;
        }
      }
    } catch (err) {
      console.error('Error normalizing category:', err);
    }

    // Calculate monthlyProfitMin from car investment entry by matching category with carname
    try {
      const CarInvestmentEntry = (await import('../models/carInvestmentEntry.js')).default;
      const category = (vehicleData.category || vehicleData.carCategory || '').trim().toLowerCase();
      
      // Find matching car investment entry by carname (not by name field)
      let matchedInvestment = await CarInvestmentEntry.findOne({ 
        carname: new RegExp(`^${category}$`, 'i') 
      });
      
      // If investorId is provided, try to find investor-specific entry first
      if (vehicleData.investorId) {
        const investorSpecificEntry = await CarInvestmentEntry.findOne({
          carname: new RegExp(`^${category}$`, 'i'),
          investorId: vehicleData.investorId
        });
        if (investorSpecificEntry) {
          matchedInvestment = investorSpecificEntry;
        }
      }
      
      if (matchedInvestment) {
        vehicleData.monthlyProfitMin = parseFloat(matchedInvestment.finalMonthlyPayout || matchedInvestment.MonthlyPayout || 0);
      }
    } catch (err) {
      console.error('Error calculating monthlyProfitMin:', err);
    }

    const documentFields = ['insuranceDoc', 'rcDoc', 'permitDoc', 'pollutionDoc', 'fitnessDoc', 'paymentDoc'];
    // Newly supported photo fields from UI
    const photoFields = [
      'registrationCardPhoto',
      'roadTaxPhoto',
      'pucPhoto',
      'permitPhoto',
      'carFrontPhoto',
      'carLeftPhoto',
      'carRightPhoto',
      'carBackPhoto',
      'carFullPhoto',
      'insurancePhoto',
      'fcPhoto',
      'interiorPhoto',
      'speedometerPhoto'
    ];
    const uploadedDocs = {};

    // Upload documents if provided as base64
    for (const field of documentFields) {
      if (vehicleData[field] && vehicleData[field].startsWith('data:')) {
        try {
          const result = await uploadToCloudinary(
            vehicleData[field],
            `vehicles/${vehicleData.registrationNumber}/${field}`
          );
          uploadedDocs[field] = result.secure_url;
        } catch (uploadErr) {
          console.error(`Failed to upload ${field}:`, uploadErr);
        }
        // prevent saving raw base64 if present
        delete vehicleData[field];
      }
    }

    // Upload new photo fields if provided as base64
    for (const field of photoFields) {
      if (vehicleData[field] && typeof vehicleData[field] === 'string' && vehicleData[field].startsWith('data:')) {
        try {
          const result = await uploadToCloudinary(
            vehicleData[field],
            `vehicles/${vehicleData.registrationNumber}/${field}`
          );
          uploadedDocs[field] = result.secure_url;
        } catch (uploadErr) {
          console.error(`Failed to upload ${field}:`, uploadErr);
        }
        // prevent saving raw base64 if present
        delete vehicleData[field];
      }
    }

    // Generate next vehicleId
    const latestVehicle = await Vehicle.findOne({}).sort({ vehicleId: -1 });
    const nextVehicleId = (latestVehicle?.vehicleId || 0) + 1;

    const vehicle = new Vehicle({
      ...vehicleData,
      ...uploadedDocs,
      vehicleId: nextVehicleId
    });

    const savedVehicle = await vehicle.save();
    // Emit dashboard notification for new vehicle
    try {
      const { createAndEmitNotification } = await import('../lib/notify.js');
      await createAndEmitNotification({
        type: 'new_vehicle',
        title: `New vehicle added - ${savedVehicle.registrationNumber || savedVehicle.vehicleId}`,
        message: `${savedVehicle.registrationNumber || savedVehicle.vehicleId} added to fleet.`,
        data: { id: savedVehicle._id, vehicleId: savedVehicle.vehicleId }
      });

      // If vehicle has an investor assigned, notify that investor directly via FCM (only if registered)
      try {
        if (savedVehicle.investorId) {
          const InvestorModel = (await import('../models/investor.js')).default;
          const investor = await InvestorModel.findById(String(savedVehicle.investorId)).lean();
          if (investor && investor._id) {
            await createAndEmitNotification({
              type: 'vehicle_registered',
              title: `Vehicle registered`,
              message: `A vehicle (${savedVehicle.registrationNumber || savedVehicle.vehicleId}) has been registered under your account.`,
              data: { id: savedVehicle._id, vehicleId: savedVehicle.vehicleId },
              recipientType: 'investor',
              recipientId: String(investor._id)
            });
            console.log(`[VEHICLE] Sent investor notification for vehicle ${savedVehicle.vehicleId} to investor ${investor._id}`);
          } else {
            console.log('[VEHICLE] No registered investor found for investorId - skipping per-user FCM');
          }
        }
      } catch (investorNotifyErr) {
        console.warn('Investor notify failed:', investorNotifyErr.message);
      }
    } catch (err) {
      console.warn('Notify failed:', err.message);
    }
    res.status(201).json(savedVehicle);
  } catch (err) {
    console.error('Error creating vehicle:', err);
    if (err && (err.code === 11000 || err.code === '11000')) {
      return res.status(409).json({ message: 'Duplicate registration number' });
    }
    res.status(500).json({ message: err?.message || 'Failed to create vehicle' });
  }
});

// Update a vehicle
router.put('/:id', async (req, res) => {
  try {
    const vehicleId = Number(req.params.id);
    const updates = stripAuthFields(req.body);

    // Normalize/coerce
    if (updates.registrationNumber) updates.registrationNumber = String(updates.registrationNumber).trim();
    if (updates.year != null) updates.year = Number(updates.year);
    if (updates.trafficFine != null) updates.trafficFine = Number(updates.trafficFine);
    
    // Handle investorId - convert to ObjectId if provided
    if (updates.investorId) {
      const mongoose = await import('mongoose');
      if (mongoose.default.Types.ObjectId.isValid(updates.investorId)) {
        updates.investorId = new mongoose.default.Types.ObjectId(updates.investorId);
      } else {
        delete updates.investorId; // Invalid ObjectId, remove it
      }
    }

    // Parse incoming date strings (startDate, endDate, paymentDate) into Date objects
    ['startDate', 'endDate', 'paymentDate'].forEach(field => {
      if (updates[field]) {
        const d = new Date(updates[field]);
        if (!isNaN(d.getTime())) {
          updates[field] = d;
        } else {
          // Invalid date — drop it to avoid saving bad data
          delete updates[field];
        }
      }
    });

    // Allow attachmentUrl and attachmentName to be saved as provided (no special handling required)


    // Normalize category and carCategory to match investment entry carnames
    try {
      const CarInvestmentEntry = (await import('../models/carInvestmentEntry.js')).default;
      const entries = await CarInvestmentEntry.find();
      const entryNames = entries.map(e => (e.carname || '').trim().toLowerCase());
      let cat = (updates.category || '').trim().toLowerCase();
      let carCat = (updates.carCategory || '').trim().toLowerCase();
      let match = entryNames.find(name => name === cat) || entryNames.find(name => name === carCat);
      if (!match) {
        // Try to auto-correct using closest match (startsWith)
        let suggestion = entryNames.find(name => cat && name.startsWith(cat.slice(0, 3))) || entryNames.find(name => carCat && name.startsWith(carCat.slice(0, 3)));
        if (suggestion) {
          if (cat && !entryNames.includes(cat)) updates.category = suggestion;
          if (carCat && !entryNames.includes(carCat)) updates.carCategory = suggestion;
        }
      }
    } catch (err) {
      console.error('Error normalizing category:', err);
    }

    // Calculate monthlyProfitMin from car investment entry on update
    try {
      const CarInvestmentEntry = (await import('../models/carInvestmentEntry.js')).default;
      const existing = await Vehicle.findOne({ vehicleId });
      const category = (updates.category || updates.carCategory || existing?.category || existing?.carCategory || '').trim().toLowerCase();
      
      // Find matching car investment entry by carname
      let matchedInvestment = await CarInvestmentEntry.findOne({ 
        carname: new RegExp(`^${category}$`, 'i') 
      });
      
      // If investorId is provided or exists, try to find investor-specific entry first
      const investorId = updates.investorId || existing?.investorId;
      if (investorId) {
        const investorSpecificEntry = await CarInvestmentEntry.findOne({
          carname: new RegExp(`^${category}$`, 'i'),
          investorId: investorId
        });
        if (investorSpecificEntry) {
          matchedInvestment = investorSpecificEntry;
        }
      }
      
      if (matchedInvestment) {
        updates.monthlyProfitMin = parseFloat(matchedInvestment.finalMonthlyPayout || matchedInvestment.MonthlyPayout || 0);
      }
    } catch (err) {
      console.error('Error calculating monthlyProfitMin:', err);
    }

    const documentFields = ['insuranceDoc', 'rcDoc', 'permitDoc', 'pollutionDoc', 'fitnessDoc', 'paymentDoc'];
    const photoFields = [
      'registrationCardPhoto',
      'roadTaxPhoto',
      'pucPhoto',
      'permitPhoto',
      'carFrontPhoto',
      'carLeftPhoto',
      'carRightPhoto',
      'carBackPhoto',
      'carFullPhoto',
      'insurancePhoto',
      'fcPhoto',
      'interiorPhoto',
      'speedometerPhoto'
    ];
    const uploadedDocs = {};

    // Upload new documents if base64 data is sent
    for (const field of documentFields) {
      if (updates[field] && updates[field].startsWith('data:')) {
        try {
          const result = await uploadToCloudinary(updates[field], `vehicles/${vehicleId}/${field}`);
          uploadedDocs[field] = result.secure_url;
        } catch (uploadErr) {
          console.error(`Failed to upload ${field}:`, uploadErr);
        }
        delete updates[field];
      }
    }

    // Upload new photo fields if base64 data is sent
    for (const field of photoFields) {
      if (updates[field] && typeof updates[field] === 'string' && updates[field].startsWith('data:')) {
        try {
          const result = await uploadToCloudinary(updates[field], `vehicles/${vehicleId}/${field}`);
          uploadedDocs[field] = result.secure_url;
        } catch (uploadErr) {
          console.error(`Failed to upload ${field}:`, uploadErr);
        }
        delete updates[field];
      }
    }

    let existing = await Vehicle.findOne({ vehicleId });
    // Track rent periods for each status change
    if (!existing.rentPeriods) existing.rentPeriods = [];
    
    // Get assigned driver information for updating plan selections
    const assignedDriver = existing.assignedDriver || updates.assignedDriver;
    
    // Track how many driver plan selections we update as part of vehicle changes
    let selectionsUpdated = 0;
    
    // Check if driver assignment is new (driver wasn't assigned before but is now)
    const isNewDriverAssignment = !existing.assignedDriver && updates.assignedDriver;
    
    // Store driver ID for notification after vehicle update
    let assignedDriverId = null;
    let assignedDriverName = null;
    let assignedVehicleInfo = null;
    
    // If a driver is being assigned for the first time
    if (isNewDriverAssignment) {
      try {
        const DriverPlanSelection = (await import('../models/driverPlanSelection.js')).default;
        const Driver = (await import('../models/driver.js')).default;
        
        // Find driver by assigned driver field (could be username, mobile, or ID)
        let driverMobiles = [];
        let driverUsernames = [];
        let driverIds = []; // Declare outside if block for use later
        
        if (updates.assignedDriver) {
          // If assignedDriver is an ObjectId (Driver._id), try to resolve the Driver first
          try {
            const mongoose = await import('mongoose');
            if (mongoose.default.Types.ObjectId.isValid(updates.assignedDriver)) {
              const byId = await Driver.findById(updates.assignedDriver).lean();
              if (byId) {
                if (byId.mobile) driverMobiles.push(byId.mobile);
                if (byId.phone) driverMobiles.push(byId.phone);
                if (byId.username) driverUsernames.push(byId.username);
              }
            }
          } catch (err) {
            console.warn('Assigned driver id lookup failed:', err.message);
          }

          // Also treat assignedDriver as username/mobile/phone and try finding Driver by those fields
          driverUsernames.push(updates.assignedDriver);
          
          const driver = await Driver.findOne({
            $or: [
              { username: updates.assignedDriver },
              { mobile: updates.assignedDriver },
              { phone: updates.assignedDriver }
            ]
          }).lean();
          
          if (driver) {
            if (driver.mobile) driverMobiles.push(driver.mobile);
            if (driver.phone) driverMobiles.push(driver.phone);
            if (driver.username) driverUsernames.push(driver.username);
          }
          
          // Find driver by identifiers
          let foundDriver = await Driver.findOne({
            $or: [
              { username: updates.assignedDriver },
              { mobile: updates.assignedDriver }
            ]
          }).lean();
          
          // If assignedDriver is an ObjectId, also try to find by _id directly
          if (!foundDriver) {
            try {
              const mongoose = await import('mongoose');
              if (mongoose.default.Types.ObjectId.isValid(updates.assignedDriver)) {
                foundDriver = await Driver.findById(updates.assignedDriver).lean();
              }
            } catch (err) {
              console.warn('Failed to find driver by ObjectId:', err.message);
            }
          }
          
          // Store driver ID and name for notification
          if (foundDriver) {
            assignedDriverId = foundDriver._id;
            assignedDriverName = foundDriver.username || foundDriver.mobile || 'Driver';
          }
          
          // Collect driver identifiers (for matching)
          if (foundDriver) {
            if (foundDriver.mobile) driverMobiles.push(foundDriver.mobile);
            if (foundDriver.username) driverUsernames.push(foundDriver.username);
            if (foundDriver._id) driverIds.push(foundDriver._id);
          }
          
          // Also try to get driver name from Driver collection if not found
          if (!assignedDriverName && driver) {
            assignedDriverName = driver.name || driver.username || driver.mobile || 'Driver';
          }
          
          // Store vehicle info for notification
          assignedVehicleInfo = {
            vehicleId: vehicleId,
            registrationNumber: existing.registrationNumber || updates.registrationNumber || '',
            model: existing.model || updates.model || '',
            brand: existing.brand || updates.brand || ''
          };
          // If assignedDriver looks like an ObjectId string, also include that as candidate id (string and ObjectId)
          try {
            const mongoose = await import('mongoose');
            if (mongoose.default.Types.ObjectId.isValid(updates.assignedDriver)) {
              driverIds.push(new mongoose.default.Types.ObjectId(updates.assignedDriver));
            }
          } catch (err) {
            console.warn('Failed to validate assignedDriver as ObjectId (collecting ids)', err.message);
          }
        }
        
        // Update plan selections for this driver - set vehicleId and rentStartDate
        const updateQuery = {
          $or: [],
          status: { $ne: 'completed' },
          rentStartDate: null // only set start date if not already set
        };
        
        // Add matches found via lookups
        if (driverMobiles.length > 0) {
          updateQuery.$or.push({ driverMobile: { $in: driverMobiles } });
        }
        if (driverUsernames.length > 0) {
          updateQuery.$or.push({ driverUsername: { $in: driverUsernames } });
        }
        // Also add direct matches in case assignedDriver is itself a mobile or username
        if (updates.assignedDriver) {
          updateQuery.$or.push({ driverMobile: updates.assignedDriver });
          updateQuery.$or.push({ driverUsername: updates.assignedDriver });
        }

        // If we have collected driver IDs, match by them as well
        if (driverIds && driverIds.length > 0) {
          updateQuery.$or.push({ driverId: { $in: driverIds } });
        }

        // Also add match by vehicleId (covers selections already referencing this vehicle)
        updateQuery.$or.push({ vehicleId: vehicleId });

        // Log collected driver ids for debugging
        if (driverIds && driverIds.length > 0) {
          console.log('(assignment) Collected driverIds:', driverIds.map(x => String(x)));
        }
        // Log the driver mobile/username candidates for debugging
        console.log('(assignment) driverMobiles:', driverMobiles, 'driverUsernames:', driverUsernames);

        // Debug: list matching selections before update
        try {
          console.log('(assignment) updateQuery:', JSON.stringify(updateQuery));
          const matchedBefore = await DriverPlanSelection.find(updateQuery).lean();
          console.log(`(assignment) Found ${matchedBefore.length} matching selections before update. Examples:`, matchedBefore.slice(0,5).map(m => ({_id: m._id, driverMobile: m.driverMobile, driverUsername: m.driverUsername, vehicleId: m.vehicleId, rentStartDate: m.rentStartDate})));
          if (matchedBefore.length === 0 && updates.assignedDriver) {
            // Additional permissive lookup to help debugging only (no updates)
            const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regex = new RegExp(escapeRegex(updates.assignedDriver), 'i');
            try {
              const fallback = await DriverPlanSelection.find({
                $or: [
                  { driverMobile: regex },
                  { driverUsername: regex },
                  { vehicleId: vehicleId }
                ],
                status: { $ne: 'completed' }
              }).limit(10).lean();
              console.log(`(assignment) Fallback found ${fallback.length} selections (regex on assignedDriver). Examples:`, fallback.map(m => ({_id: m._id, driverMobile: m.driverMobile, driverUsername: m.driverUsername, vehicleId: m.vehicleId, rentStartDate: m.rentStartDate})));
            } catch (err) {
              console.error('Error running fallback debug query (assignment):', err.message);
            }
          }
        } catch (err) {
          console.error('Error listing matching selections before update (assignment):', err.message);
        }

        const result = await DriverPlanSelection.updateMany(
          updateQuery,
          { 
            $set: { 
              vehicleId: vehicleId,
              rentStartDate: new Date() // Start rent counting from driver assignment
            } 
          }
        );
        selectionsUpdated += (result.modifiedCount || 0);
        console.log(`Updated ${result.modifiedCount} driver plan selections with vehicleId and rentStartDate for newly assigned driver on vehicle ${vehicleId}`);

        // Auto-activate vehicle and start rent periods when assigning a driver
        // (This ensures UI shows rent counting started immediately after assignment.)
        try {
          if (existing.status !== 'active') {
            updates.status = 'active';
            updates.rentStartDate = new Date();
            updates.rentPausedDate = null;
            existing.rentPeriods = [{ start: new Date(), end: null }];
            updates.rentPeriods = existing.rentPeriods;
            console.log(`Auto-activated vehicle ${vehicleId} and started rent due to driver assignment.`);
          }
        } catch (err) {
          console.warn('Failed to auto-activate vehicle after assignment:', err.message);
        }

        // Send notification to driver about vehicle assignment
        try {
          const { createAndEmitNotification } = await import('../lib/notify.js');
          
          // Convert driverId to Driver._id for FCM notification
          let driverRecipientId = String(assignedDriverId || '');
          
          if (assignedDriverId) {
            try {
              const driver = await Driver.findById(assignedDriverId).lean();
              if (driver && driver._id) {
                driverRecipientId = String(driver._id);
                console.log(`[VEHICLE ASSIGNMENT] Using Driver._id ${driverRecipientId} for notification (from driverId ${assignedDriverId})`);
              }
            } catch (lookupErr) {
              console.warn('[VEHICLE ASSIGNMENT] Driver lookup failed:', lookupErr.message);
            }
          }

          if (driverRecipientId && assignedVehicleInfo) {
            const vehicleDisplay = assignedVehicleInfo.registrationNumber ||
                                   `${assignedVehicleInfo.brand} ${assignedVehicleInfo.model}`.trim() || 
                                   `Vehicle #${assignedVehicleInfo.vehicleId}`;
            
            // Notify driver
            await createAndEmitNotification({
              type: 'vehicle_assigned',
              title: 'Vehicle Assigned to You!',
              message: `${vehicleDisplay} has been assigned to you. Rent calculation starts now.`,
              data: {
                vehicleId: assignedVehicleInfo.vehicleId,
                registrationNumber: assignedVehicleInfo.registrationNumber,
                model: assignedVehicleInfo.model,
                brand: assignedVehicleInfo.brand,
                assignedAt: new Date().toISOString()
              },
              recipientType: 'driver',
              recipientId: driverRecipientId
            });
            
            // Also notify admins
            await createAndEmitNotification({
              type: 'vehicle_assignment_admin',
              title: `Vehicle assigned to driver`,
              message: `${vehicleDisplay} assigned to ${assignedDriverName || 'driver'}`,
              data: {
                vehicleId: assignedVehicleInfo.vehicleId,
                driverName: assignedDriverName,
                registrationNumber: assignedVehicleInfo.registrationNumber
              },
              recipientType: 'admin',
              recipientId: null
            });
            
            console.log(`✅ Vehicle assignment notification sent to driver ${driverRecipientId} for vehicle ${vehicleId}`);
          } else {
            console.log('⚠️ Skipping vehicle assignment notification - missing driver or vehicle info');
          }
        } catch (notifyErr) {
          console.warn('Failed to send vehicle assignment notification:', notifyErr.message);
        }
      } catch (err) {
        console.error('Error updating driver plan selections for new driver assignment:', err);
      }
    }
    
    // If status is being set to active
    if (updates.status === 'active') {
      // Clear any previous periods and start fresh
      existing.rentPeriods = [{ start: new Date(), end: null }];
      updates.rentPeriods = existing.rentPeriods;
      updates.rentStartDate = new Date();
      updates.startDate = new Date();
      updates.endDate = null;
      updates.rentPausedDate = null;
      
      // Update associated driver plan selections to active
      try {
        const DriverPlanSelection = (await import('../models/driverPlanSelection.js')).default;
        const Driver = (await import('../models/driver.js')).default;
        
        // Find driver by assigned driver field (could be username, mobile, or ID)
        let driverMobiles = [];
        let driverUsernames = [];
        // Always declare driverIds so subsequent logic can reference it even when assignedDriver is not provided
        let driverIds = [];
        
        if (assignedDriver) {
          // If assignedDriver is an ObjectId (Driver._id), try to resolve the Driver first
          try {
            const mongoose = await import('mongoose');
            if (mongoose.default.Types.ObjectId.isValid(assignedDriver)) {
              const byId = await Driver.findById(assignedDriver).lean();
              if (byId) {
                if (byId.mobile) driverMobiles.push(byId.mobile);
                if (byId.phone) driverMobiles.push(byId.phone);
                if (byId.username) driverUsernames.push(byId.username);
              }
            }
          } catch (err) {
            console.warn('Assigned driver id lookup failed (activation):', err.message);
          }

          driverUsernames.push(assignedDriver);
          
          // Try to find driver in Driver collection by username/mobile/phone
          const driver = await Driver.findOne({
            $or: [
              { username: assignedDriver },
              { mobile: assignedDriver },
              { phone: assignedDriver }
            ]
          }).lean();
          
          if (driver) {
            if (driver.mobile) driverMobiles.push(driver.mobile);
            if (driver.phone) driverMobiles.push(driver.phone);
            if (driver.username) driverUsernames.push(driver.username);
          }
          
          // Also check Driver collection by username/mobile and collect driver ids
          const driverFromDb = await Driver.findOne({
            $or: [
              { username: assignedDriver },
              { mobile: assignedDriver }
            ]
          }).lean();
          
          // Collect driver identifiers (append to outer driverIds)
          if (driverFromDb) {
            if (driverFromDb.mobile) driverMobiles.push(driverFromDb.mobile);
            if (driverFromDb.username) driverUsernames.push(driverFromDb.username);
            if (driverFromDb._id) driverIds.push(driverFromDb._id);
          }

          // If assignedDriver looks like an ObjectId string, also include that as candidate id
          try {
            const mongoose = await import('mongoose');
            if (mongoose.default.Types.ObjectId.isValid(assignedDriver)) {
              driverIds.push(new mongoose.default.Types.ObjectId(assignedDriver));
            }
          } catch (err) {
            console.warn('Failed to validate assignedDriver as ObjectId (activation ids)', err.message);
          }
        }
        
        // Update plan selections by vehicleId OR by driver mobile/username (use regex to handle formatting differences)
        const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\\]\\]/g, '\\$&');
        const updateQuery = {
          $or: [
            { vehicleId: vehicleId }
          ],
          status: { $ne: 'completed' }
        };

        if (driverMobiles.length > 0) {
          updateQuery.$or.push({ driverMobile: { $in: driverMobiles.map(m => new RegExp(`^${escapeRegex(m)}$`, 'i')) } });
        }
        if (driverUsernames.length > 0) {
          updateQuery.$or.push({ driverUsername: { $in: driverUsernames.map(u => new RegExp(`^${escapeRegex(u)}$`, 'i')) } });
        }
        // Also add permissive regex matches in case assignedDriver is a raw mobile/username or id string
        if (assignedDriver) {
          const esc = escapeRegex(assignedDriver);
          updateQuery.$or.push({ driverMobile: new RegExp(`^${esc}$`, 'i') });
          updateQuery.$or.push({ driverUsername: new RegExp(`^${esc}$`, 'i') });
        }

        // If we have collected driver IDs, use them too (include ObjectId or string representations)
        if (driverIds && driverIds.length > 0) {
          updateQuery.$or.push({ driverId: { $in: driverIds } });
          // Also include string forms in case older documents stored string ids
          updateQuery.$or.push({ driverId: { $in: driverIds.map(x => x.toString()) } });
          console.log('(activation) Collected driverIds:', driverIds.map(x => String(x)));
        }

        // Log the driver mobile/username candidates for debugging
        console.log('(activation) driverMobiles:', driverMobiles, 'driverUsernames:', driverUsernames);

        // Debug: list matching selections before status->active update
        try {
          console.log('(activation) updateQuery:', JSON.stringify(updateQuery), 'assignedDriver:', assignedDriver);
          const matchedBefore = await DriverPlanSelection.find(updateQuery).lean();
          console.log(`(activation) Found ${matchedBefore.length} matching selections before update. Examples:`, matchedBefore.slice(0,5).map(m => ({_id: m._id, driverMobile: m.driverMobile, driverUsername: m.driverUsername, vehicleId: m.vehicleId, rentStartDate: m.rentStartDate})));
          if (matchedBefore.length === 0 && assignedDriver) {
            // Additional permissive lookup to help debugging only (no updates)
            const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regex = new RegExp(escapeRegex(assignedDriver), 'i');
            try {
              const fallback = await DriverPlanSelection.find({
                $or: [
                  { driverMobile: regex },
                  { driverUsername: regex },
                  { vehicleId: vehicleId }
                ],
                status: { $ne: 'completed' }
              }).limit(10).lean();
              console.log(`(activation) Fallback found ${fallback.length} selections (regex on assignedDriver). Examples:`, fallback.map(m => ({_id: m._id, driverMobile: m.driverMobile, driverUsername: m.driverUsername, vehicleId: m.vehicleId, rentStartDate: m.rentStartDate})));
            } catch (err) {
              console.error('Error running fallback debug query (activation):', err.message);
            }
          }
        } catch (err) {
          console.error('Error listing matching selections before update (activation):', err.message);
        }

        const result = await DriverPlanSelection.updateMany(
          updateQuery,
          { 
            $set: { 
              status: 'active',
              rentPausedDate: null,
              vehicleId: vehicleId, // Also set vehicleId for future reference
              rentStartDate: new Date() // Start rent counting from driver assignment
            } 
          }
        );
        selectionsUpdated += (result.modifiedCount || 0);
        
        console.log(`Updated ${result.modifiedCount} driver plan selections to active for vehicle ${vehicleId}`);
      } catch (err) {
        console.error('Error updating driver plan selections:', err);
      }
    }
    // If status is being set to inactive, clear all rent periods
    if (updates.status === 'inactive' || updates.status === 'suspended') {
      updates.rentPeriods = [];
      updates.rentPausedDate = new Date();
      updates.rentStartDate = null;
      updates.endDate = new Date();
      
      // Update associated driver plan selections to inactive
      try {
        const DriverPlanSelection = (await import('../models/driverPlanSelection.js')).default;
        const Driver = (await import('../models/driver.js')).default;
        
        // Find driver by assigned driver field (could be username, mobile, or ID)
        let driverMobiles = [];
        let driverUsernames = [];
        let driverIds = [];
        
        if (assignedDriver) {
          // If assignedDriver is an ObjectId (Driver._id), try to resolve the Driver first
          try {
            const mongoose = await import('mongoose');
            if (mongoose.default.Types.ObjectId.isValid(assignedDriver)) {
              const byId = await Driver.findById(assignedDriver).lean();
              if (byId) {
                if (byId.mobile) driverMobiles.push(byId.mobile);
                if (byId.phone) driverMobiles.push(byId.phone);
                if (byId.username) driverUsernames.push(byId.username);
                // If driver._id matches, also include as an id candidate
                if (byId._id) driverIds.push(byId._id);
              }
            }
          } catch (err) {
            console.warn('Assigned driver id lookup failed (inactivation):', err.message);
          }

          driverUsernames.push(assignedDriver);
          
          // Try to find driver in Driver collection by username/mobile/phone
          const driver = await Driver.findOne({
            $or: [
              { username: assignedDriver },
              { mobile: assignedDriver },
              { phone: assignedDriver }
            ]
          }).lean();
          
          if (driver) {
            if (driver.mobile) driverMobiles.push(driver.mobile);
            if (driver.phone) driverMobiles.push(driver.phone);
            if (driver.username) driverUsernames.push(driver.username);
            if (driver._id) driverSignupIds.push(driver._id);
          }
        }
        
        // Update plan selections by vehicleId OR by driver mobile/username (use regex to handle formatting differences)
        const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\\]\\]/g, '\\$&');
        const updateQuery = {
          $or: [
            { vehicleId: vehicleId }
          ],
          status: { $ne: 'completed' }
        };

        if (driverMobiles.length > 0) {
          updateQuery.$or.push({ driverMobile: { $in: driverMobiles.map(m => new RegExp(`^${escapeRegex(m)}$`, 'i')) } });
        }
        if (driverUsernames.length > 0) {
          updateQuery.$or.push({ driverUsername: { $in: driverUsernames.map(u => new RegExp(`^${escapeRegex(u)}$`, 'i')) } });
        }
        // If assignedDriver present, add permissive regex matches as well
        if (assignedDriver) {
          const esc = escapeRegex(assignedDriver);
          updateQuery.$or.push({ driverMobile: new RegExp(`^${esc}$`, 'i') });
          updateQuery.$or.push({ driverUsername: new RegExp(`^${esc}$`, 'i') });
        }

        // If we have collected driver IDs, use them too
        if (driverSignupIds && driverSignupIds.length > 0) {
          updateQuery.$or.push({ driverId: { $in: driverSignupIds } });
          updateQuery.$or.push({ driverId: { $in: driverSignupIds.map(x => x.toString()) } });
          console.log('(inactivation) Collected driverIds:', driverSignupIds.map(x => String(x)));
        }

        // Debug: log the query we're running for inactivation
        console.log('(inactivation) updateQuery:', JSON.stringify(updateQuery));

        const result = await DriverPlanSelection.updateMany(
          updateQuery,
          { 
            $set: { 
              status: 'inactive',
              rentPausedDate: new Date(),
              vehicleId: vehicleId, // Also set vehicleId for future reference
              rentStartDate: null // Clear rent start so rent restarts when vehicle is re-activated
            } 
          }
        );
        
        selectionsUpdated += (result.modifiedCount || 0);
        console.log(`Updated ${result.modifiedCount} driver plan selections to inactive for vehicle ${vehicleId}`);
      } catch (err) {
        console.error('Error updating driver plan selections:', err);
      }
    }

    // KYC status activation logic
    if (updates.kycStatus === 'active' && (!existing || !existing.kycActivatedDate)) {
      updates.kycActivatedDate = new Date();
    }
    // If KYC status is set to inactive, clear kycActivatedDate
    if (updates.kycStatus === 'inactive') {
      updates.kycActivatedDate = null;
    }

      // KYC verified logic
      if (updates.kycStatus === 'active' && (!existing || !existing.kycVerifiedDate)) {
        updates.kycVerifiedDate = new Date();
      }
      if (updates.kycStatus === 'inactive') {
        updates.kycVerifiedDate = null;
      }

    // Calculate total active months from rentPeriods
    let activeMonths = 0;
    let monthlyProfitMin = (typeof updates !== 'undefined' && updates.monthlyProfitMin !== undefined)
      ? updates.monthlyProfitMin
      : (existing.monthlyProfitMin || 0);
    if (Array.isArray(existing.rentPeriods)) {
      existing.rentPeriods.forEach(period => {
        const start = new Date(period.start);
        const end = period.end ? new Date(period.end) : new Date();
        const diffDays = Math.floor((end - start) / (1000 * 60 * 60 * 24));
        activeMonths += Math.floor(diffDays / 30) + 1;
      });
    }
    updates.totalProfit = monthlyProfitMin * activeMonths;

    const vehicle = await Vehicle.findOneAndUpdate(
      { vehicleId },
      { ...updates, ...uploadedDocs },
      { new: true }
    ).lean();

    if (!vehicle) {
      return res.status(404).json({ message: 'Vehicle not found' });
    }

    // Send notification to driver signup if vehicle was assigned to a signup (use driver_signup to avoid pushing to real driver IDs)
    if (isNewDriverAssignment && assignedDriverSignupId) {
      try {
        const { createAndEmitNotification } = await import('../lib/notify.js');
        const vehicleDetails = `${assignedVehicleInfo.carName ? assignedVehicleInfo.carName + ' ' : ''}${assignedVehicleInfo.model || ''} (${assignedVehicleInfo.registrationNumber || 'N/A'})`.trim();
        
        await createAndEmitNotification({
          type: 'vehicle_assigned',
          title: `Vehicle Assigned`,
          message: `A vehicle has been assigned to you: ${vehicleDetails}`,
          data: { 
            vehicleId: assignedVehicleInfo.vehicleId,
            registrationNumber: assignedVehicleInfo.registrationNumber,
            model: assignedVehicleInfo.model,
            brand: assignedVehicleInfo.brand
          },
          recipientType: 'driver',
          recipientId: String(assignedDriverSignupId)
        });
        console.log(`✅ Notification sent to driver ${assignedDriverSignupId} for vehicle assignment ${assignedVehicleInfo.vehicleId}`);
      } catch (notifyErr) {
        console.warn('Failed to send vehicle assignment notification:', notifyErr.message);
      }
    }

    // Include selectionsUpdated so callers can know whether to refresh related plan selections
    res.json({ vehicle, updatedSelections: selectionsUpdated });
  } catch (err) {
    console.error('Error updating vehicle:', err);
    if (err && (err.code === 11000 || err.code === '11000')) {
      return res.status(409).json({ message: 'Duplicate registration number' });
    }
    res.status(500).json({ message: err?.message || 'Failed to update vehicle' });
  }
});

// Delete a vehicle
router.delete('/:id', async (req, res) => {
  try {
    const vehicleId = Number(req.params.id);
    const result = await Vehicle.deleteOne({ vehicleId });
    if (result.deletedCount === 0) {
      return res.status(404).json({ message: 'Vehicle not found' });
    }
    res.json({ message: 'Vehicle deleted successfully' });
  } catch (err) {
    console.error('Error deleting vehicle:', err);
    res.status(500).json({ message: 'Failed to delete vehicle' });
  }
});

// Get weekly rent slabs for a vehicle
router.get('/:id/weekly-rent-slabs', async (req, res) => {
  try {
    const vehicleId = Number(req.params.id);
    const vehicle = await Vehicle.findOne({ vehicleId }).lean();
    if (!vehicle) return res.status(404).json({ message: 'Vehicle not found' });
    res.json(vehicle.weeklyRentSlabs || []);
  } catch (err) {
    console.error('Error fetching weekly rent slabs:', err);
    res.status(500).json({ message: 'Failed to fetch weekly rent slabs' });
  }
});

// Update weekly rent slabs for a vehicle
router.put('/:id/weekly-rent-slabs', async (req, res) => {
  try {
    const vehicleId = Number(req.params.id);
    const { slabs } = req.body;
    if (!Array.isArray(slabs)) return res.status(400).json({ message: 'slabs must be an array' });
    const updated = await Vehicle.findOneAndUpdate(
      { vehicleId },
      { weeklyRentSlabs: slabs },
      { new: true }
    ).lean();
    if (!updated) return res.status(404).json({ message: 'Vehicle not found' });
    res.json(updated.weeklyRentSlabs);
  } catch (err) {
    console.error('Error updating weekly rent slabs:', err);
    res.status(500).json({ message: 'Failed to update weekly rent slabs' });
  }
});

// Get daily rent slabs for a vehicle
router.get('/:id/daily-rent-slabs', async (req, res) => {
  try {
    const vehicleId = Number(req.params.id);
    const vehicle = await Vehicle.findOne({ vehicleId }).lean();
    if (!vehicle) return res.status(404).json({ message: 'Vehicle not found' });
    res.json(vehicle.dailyRentSlabs || []);
  } catch (err) {
    console.error('Error fetching daily rent slabs:', err);
    res.status(500).json({ message: 'Failed to fetch daily rent slabs' });
  }
});

// Update daily rent slabs for a vehicle
router.put('/:id/daily-rent-slabs', async (req, res) => {
  try {
    const vehicleId = Number(req.params.id);
    const { slabs } = req.body;
    if (!Array.isArray(slabs)) return res.status(400).json({ message: 'slabs must be an array' });
    const updated = await Vehicle.findOneAndUpdate(
      { vehicleId },
      { dailyRentSlabs: slabs },
      { new: true }
    ).lean();
    if (!updated) return res.status(404).json({ message: 'Vehicle not found' });
    res.json(updated.dailyRentSlabs);
  } catch (err) {
    console.error('Error updating daily rent slabs:', err);
    res.status(500).json({ message: 'Failed to update daily rent slabs' });
  }
});

// Get monthly profit for a vehicle by vehicleId
router.get('/:id/monthly-profit', async (req, res) => {
  try {
    const vehicleId = Number(req.params.id);
    const vehicle = await Vehicle.findOne({ vehicleId }).lean();
    if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });

    // Find matching car investment entry
    const CarInvestmentEntry = (await import('../models/carInvestmentEntry.js')).default;
    const category = (vehicle.category || vehicle.carCategory || '').toLowerCase();
    const matchedInvestment = await CarInvestmentEntry.findOne({ name: new RegExp(`^${category}$`, 'i') });

    let monthlyProfit = 0;
    if (vehicle.monthlyProfitMin && vehicle.monthlyProfitMin > 0) {
      monthlyProfit = vehicle.monthlyProfitMin;
    } else if (matchedInvestment) {
      monthlyProfit = matchedInvestment.minAmount * (matchedInvestment.expectedROI / 100) / 12;
    }

    res.json({ vehicleId, monthlyProfit });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;