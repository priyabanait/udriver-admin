
import express from 'express';
import CarPlan from '../models/carPlan.js';
import { uploadToCloudinary } from '../lib/cloudinary.js';

const router = express.Router();

// List all weekly rent plans
router.get('/', async (req, res) => {
  try {
    const list = await CarPlan.find({ 
      weeklyRentSlabs: { $exists: true, $ne: [] } 
    }).lean();
    res.json(list);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to load weekly rent plans' });
  }
});

// Get single weekly rent plan
router.get('/:id', async (req, res) => {
  try {
    const plan = await CarPlan.findById(req.params.id).lean();
    if (!plan || !plan.weeklyRentSlabs || plan.weeklyRentSlabs.length === 0) {
      return res.status(404).json({ message: 'Weekly rent plan not found' });
    }
    res.json(plan);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to load weekly rent plan' });
  }
});

// Create weekly rent plan
router.post('/', async (req, res) => {
  try {
    const body = req.body;
    console.log('weekly-rent-plans POST payload:', JSON.stringify(body).slice(0, 1000));

    // Handle photo upload if present
    let photoUrl = null;
    if (body.photo && typeof body.photo === 'string' && body.photo.startsWith('data:')) {
      try {
        const result = await uploadToCloudinary(body.photo, `car-plans/${Date.now()}`);
        photoUrl = result.secure_url;
      } catch (err) {
        console.error('Failed to upload car plan photo:', err);
      }
    }

    const payload = {
      name: body.name || 'Weekly Rent Plan',
      vehicleType: body.vehicleType || body.category || 'General',
      securityDeposit: body.securityDeposit || 0,
      weeklyRentSlabs: Array.isArray(body.weeklyRentSlabs) ? body.weeklyRentSlabs : [],
      dailyRentSlabs: [], // Empty for weekly plans
      status: body.status || 'active',
      category: body.category || 'standard',
      createdDate: body.createdDate || new Date().toISOString(),
      photo: photoUrl // Store photo URL if uploaded
    };

    const p = new CarPlan(payload);
    await p.save();
    console.log('weekly-rent-plan saved id=', p._id);
    res.status(201).json(p);
  } catch (err) {
    console.error('weekly-rent-plans POST error:', err);
    res.status(400).json({ message: 'Failed to create weekly rent plan', error: err.message || String(err) });
  }
});

// Update weekly rent plan
router.put('/:id', async (req, res) => {
  try {
    const body = req.body;
    // Handle photo upload if present and is base64
    let photoUrl = body.photo;
    if (body.photo && typeof body.photo === 'string' && body.photo.startsWith('data:')) {
      try {
        const result = await uploadToCloudinary(body.photo, `car-plans/${Date.now()}`);
        photoUrl = result.secure_url;
      } catch (err) {
        console.error('Failed to upload car plan photo:', err);
      }
    }
    const updateData = {
      ...body,
      weeklyRentSlabs: Array.isArray(body.weeklyRentSlabs) ? body.weeklyRentSlabs : [],
      photo: photoUrl
    };
    const updated = await CarPlan.findByIdAndUpdate(req.params.id, updateData, { new: true }).lean();
    if (!updated) return res.status(404).json({ message: 'Not found' });
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(400).json({ message: 'Failed to update weekly rent plan' });
  }
});

// Delete weekly rent plan
router.delete('/:id', async (req, res) => {
  try {
    const removed = await CarPlan.findByIdAndDelete(req.params.id).lean();
    if (!removed) return res.status(404).json({ message: 'Not found' });
    res.json({ message: 'Deleted' });
  } catch (err) {
    console.error(err);
    res.status(400).json({ message: 'Failed to delete weekly rent plan' });
  }
});

export default router;
