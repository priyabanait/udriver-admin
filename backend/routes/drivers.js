
import express from 'express';
import Driver from '../models/driver.js';
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

router.get('/', async (req, res) => {
  const list = await Driver.find().lean();
  res.json(list);
});

router.get('/:id', async (req, res) => {
  const id = Number(req.params.id);
  const item = await Driver.findOne({ id }).lean();
  if (!item) return res.status(404).json({ message: 'Driver not found' });
  res.json(item);
});


// Create new driver with document uploads
router.post('/', async (req, res) => {
  try {
    const fields = stripAuthFields(req.body);
    const max = await Driver.find().sort({ id: -1 }).limit(1).lean();
    const nextId = (max[0]?.id || 0) + 1;

    // Handle document uploads to Cloudinary
    const documentFields = ['profilePhoto', 'licenseDocument', 'aadharDocument', 'panDocument', 'bankDocument'];
    const uploadedDocs = {};

    for (const field of documentFields) {
      if (fields[field] && fields[field].startsWith('data:')) {
        try {
          const result = await uploadToCloudinary(fields[field], `drivers/${nextId}/${field}`);
          uploadedDocs[field] = result.secure_url;
        } catch (uploadErr) {
          console.error(`Failed to upload ${field}:`, uploadErr);
        }
      }
    }

    // Create driver with uploaded document URLs
    const driverData = {
      id: nextId,
      ...fields,
      ...uploadedDocs
    };

    // Remove base64 data to prevent large document size
    documentFields.forEach(field => {
      if (driverData[field]?.startsWith('data:')) {
        delete driverData[field];
      }
    });

    const newDriver = await Driver.create(driverData);
    res.status(201).json(newDriver);
  } catch (err) {
    console.error('Driver create error:', err);
    res.status(500).json({ message: 'Failed to create driver', error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const fields = stripAuthFields(req.body);

    // Handle document uploads to Cloudinary
    const documentFields = ['profilePhoto', 'licenseDocument', 'aadharDocument', 'panDocument', 'bankDocument'];
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

    // Update driver data with uploaded document URLs
    const updateData = {
      ...fields,
      ...uploadedDocs
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

export default router;
