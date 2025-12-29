
import express from 'express';
import Driver from '../models/driver.js';
import DriverSignup from '../models/driverSignup.js';
// auth middleware not applied; token used only for login
import { uploadToCloudinary } from '../lib/cloudinary.js';

const router = express.Router();

// Update a driver signup credential
router.put('/signup/credentials/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updated = await DriverSignup.findByIdAndUpdate(
      id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!updated) {
      return res.status(404).json({ message: 'Driver signup not found' });
    }
    res.json(updated);
  } catch (err) {
    console.error('Error updating driver signup:', err);
    res.status(400).json({ message: 'Failed to update driver signup', error: err.message });
  }
});

// Delete a driver signup credential
router.delete('/signup/credentials/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await DriverSignup.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ message: 'Driver signup not found' });
    }
    res.json({ message: 'Driver signup deleted', driver: deleted });
  } catch (err) {
    console.error('Error deleting driver signup:', err);
    res.status(400).json({ message: 'Failed to delete driver signup', error: err.message });
  }
});
// GET driver form data by mobile number
router.get('/form/mobile/:phone', async (req, res) => {
try {
    const { phone } = req.params;
    const driver = await Driver.findOne({ phone }).lean();
    if (!driver) {
      return res.status(404).json({ error: 'Driver not found' });
    }
    res.json({ driver });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch driver', message: error.message });
  }
});

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

router.get('/', async (req, res) => {
  try {
    // Pagination parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const sortBy = req.query.sortBy || 'createdAt';
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;

    // By default include all drivers (both admin-added and self-registered).
    // If `manualOnly=true` query param is provided, only return admin-added drivers to preserve legacy behavior.
    const manualOnly = req.query.manualOnly === 'true';
    const filter = manualOnly ? { isManualEntry: true } : {};

    const total = await Driver.countDocuments(filter);
    const list = await Driver.find(filter)
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
        hasMore: page * limit < total
      }
    });
  } catch (error) {
    console.error('Error fetching drivers:', error);
    res.status(500).json({ message: 'Failed to fetch drivers', error: error.message });
  }
});

// GET signup drivers (self-registered with username/mobile/password)
router.get('/signup/credentials', async (req, res) => {
  try {
    // Pagination parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const sortBy = req.query.sortBy || 'signupDate';
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;

    const total = await DriverSignup.countDocuments();
    const list = await DriverSignup.find()
      .select('username mobile password status kycStatus signupDate registrationCompleted name profilePhoto signature licenseDocument aadharDocument aadharDocumentBack panDocument bankDocument electricBillDocument')
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
        hasMore: page * limit < total
      }
    });
  } catch (error) {
    console.error('Error fetching signup credentials:', error);
    res.status(500).json({ message: 'Failed to fetch signup credentials' });
  }
});

router.get('/:id', async (req, res) => {
  const id = Number(req.params.id);
  const item = await Driver.findOne({ id }).lean();
  if (!item) return res.status(404).json({ message: 'Driver not found' });
  res.json(item);
});


// Create new driver with document uploads (or complete registration for existing driver)
router.post('/', async (req, res) => {
  try {
    const fields = stripAuthFields(req.body);
    // Determine next id only when creating a new driver
    const max = await Driver.find().sort({ id: -1 }).limit(1).lean();
    const nextId = (max[0]?.id || 0) + 1;

    // Document fields we expect
    const documentFields = ['profilePhoto', 'signature', 'licenseDocument', 'aadharDocument', 'aadharDocumentBack', 'panDocument', 'bankDocument', 'electricBillDocument'];

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
      if (fields[field] && typeof fields[field] === 'string' && fields[field].startsWith('data:')) {
        try {
          const result = await uploadToCloudinary(fields[field], `drivers/${targetId}/${field}`);
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
      emergencyRelation: fields.emergencyRelation || '',
      emergencyPhoneSecondary: fields.emergencyPhoneSecondary || ''
    };

    // If there is a DriverSignup for this mobile, mark registration complete there and copy any missing docs
    let signupDoc = null;
    if (baseData.mobile) {
      signupDoc = await DriverSignup.findOneAndUpdate(
        { mobile: baseData.mobile },
        { registrationCompleted: true, status: 'active' },
        { new: true }
      ).lean();
      if (signupDoc) {
        for (const f of documentFields) {
          if (!baseData[f] && signupDoc[f]) baseData[f] = signupDoc[f];
        }
      }
    }

    // Remove raw base64 data from payload
    documentFields.forEach(field => {
      if (baseData[field]?.startsWith && baseData[field].startsWith('data:')) {
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
        isManualEntry: signupDoc ? false : existingDriver.isManualEntry
      };

      const updated = await Driver.findOneAndUpdate({ mobile: baseData.mobile }, updateData, { new: true }).lean();

      if (!updated) {
        return res.status(404).json({ message: 'Driver not found to update' });
      }

      // Notify the driver that their registration is pending approval (if signup exists)
      try {
        if (signupDoc && signupDoc._id) {
          const { createAndEmitNotification } = await import('../lib/notify.js');
          await createAndEmitNotification({
            type: 'driver_registration_completed',
            title: `Registration Submitted`,
            message: `Your registration is pending approval. We'll notify you once it's reviewed.`,
            data: { id: updated._id, driverId: updated.id },
            recipientType: 'driver',
            recipientId: signupDoc._id
          });
        }
      } catch (err) {
        console.warn('Notify failed:', err.message);
      }

      return res.json(updated);
    }

    // Otherwise create a new driver (admin flow)
    const driverData = {
      id: nextId,
      ...baseData,
      isManualEntry: signupDoc ? false : true,
      registrationCompleted: true
    };

    const created = await Driver.create(driverData);

    // Notify admins and the driver (if signup exists)
    try {
      const { createAndEmitNotification } = await import('../lib/notify.js');
      await createAndEmitNotification({
        type: 'driver_added',
        title: `Driver added: ${created.name || created.mobile || created.username || 'N/A'}`,
        message: `Admin has added a new driver with ID: ${created.id || created._id}`,
        data: { id: created._id, driverId: created.id, mobile: created.mobile },
        recipientType: null,
        recipientId: null
      });

      if (created.mobile && signupDoc && signupDoc._id) {
        await createAndEmitNotification({
          type: 'driver_added',
          title: `Your profile has been created`,
          message: `Admin has created your driver profile. Your ID is ${created.id || created._id}`,
          data: { id: created._id, driverId: created.id },
          recipientType: 'driver',
          recipientId: signupDoc._id
        });
      }
    } catch (err) {
      console.warn('Notify failed:', err.message);
    }

    res.status(201).json(created);
  } catch (err) {
    console.error('Driver create error:', err);
    // If duplicate key error slips through, try to return a helpful message instead of crashing
    if (err && err.code === 11000) {
      return res.status(409).json({ message: 'Driver with this mobile already exists', error: err.message });
    }
    res.status(500).json({ message: 'Failed to create/update driver', error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const fields = stripAuthFields(req.body);

    // If signature or document fields are missing, try to copy from corresponding DriverSignup
    const documentFields = ['profilePhoto', 'signature', 'licenseDocument', 'aadharDocument', 'aadharDocumentBack', 'panDocument', 'bankDocument', 'electricBillDocument'];
    if (fields.mobile) {
      const signup = await DriverSignup.findOne({ mobile: fields.mobile }).lean();
      if (signup) {
        for (const f of documentFields) {
          if (!fields[f] && signup[f]) fields[f] = signup[f];
        }
      }
    }

    // Handle document uploads to Cloudinary
    const uploadedDocs = {}; 

    for (const field of documentFields) {
      if (fields[field] && fields[field].startsWith('data:')) {
        try {
          const result = await uploadToCloudinary(fields[field], `drivers/${id}/${field}`);
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
      emergencyRelation: fields.emergencyRelation || '',
      emergencyPhoneSecondary: fields.emergencyPhoneSecondary || ''
    };

    // Remove base64 data to prevent large document size
    documentFields.forEach(field => {
      if (updateData[field]?.startsWith('data:')) {
        delete updateData[field];
      }
    });

    const updated = await Driver.findOneAndUpdate(
      { id },
      updateData,
      { new: true }
    ).lean();

    if (!updated) {
      return res.status(404).json({ message: 'Driver not found' });
    }

    res.json(updated);
  } catch (err) {
    console.error('Driver update error:', err);
    res.status(500).json({ message: 'Failed to update driver', error: err.message });
  }
});


router.delete('/:id', async (req, res) => {
  const id = Number(req.params.id);
  await Driver.deleteOne({ id });
  res.json({ message: 'Deleted' });
});

// GET driver earnings summary
router.get('/earnings/summary', async (req, res) => {
  try {
    // Mock driver earnings data (replace with actual calculation from trips/payments)
    const driverEarnings = [
      {
        driverId: 'DR001',
        driverName: 'Rajesh Kumar',
        monthlyEarnings: 52000,
        totalTrips: 180,
        averageRating: 4.7,
        totalDistance: 1800,
        pendingAmount: 0,
        lastPayment: '2024-11-01'
      },
      {
        driverId: 'DR002',
        driverName: 'Priya Sharma',
        monthlyEarnings: 65000,
        totalTrips: 220,
        averageRating: 4.9,
        totalDistance: 2200,
        pendingAmount: 15725,
        lastPayment: '2024-10-25'
      },
      {
        driverId: 'DR003',
        driverName: 'Amit Singh',
        monthlyEarnings: 48000,
        totalTrips: 160,
        averageRating: 4.5,
        totalDistance: 1600,
        pendingAmount: 5000,
        lastPayment: '2024-11-02'
      },
      {
        driverId: 'DR004',
        driverName: 'Sunita Patel',
        monthlyEarnings: 42000,
        totalTrips: 145,
        averageRating: 4.6,
        totalDistance: 1450,
        pendingAmount: 10200,
        lastPayment: '2024-10-28'
      },
      {
        driverId: 'DR005',
        driverName: 'Vikram Reddy',
        monthlyEarnings: 58000,
        totalTrips: 195,
        averageRating: 4.8,
        totalDistance: 1950,
        pendingAmount: 0,
        lastPayment: '2024-11-03'
      }
    ];
    
    res.json(driverEarnings);
  } catch (err) {
    console.error('Error fetching driver earnings:', err);
    res.status(500).json({ message: 'Failed to fetch driver earnings', error: err.message });
  }
});

export default router;
