import express from 'express';
import cloudinary from '../lib/cloudinary.js';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import multer from 'multer';
import Slider from '../models/slider.js';
import { authenticateToken, requirePermission } from './middleware.js';

const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    const folder = 'sliders';
    const originalName = file.originalname?.replace(/\.[^/.]+$/, '') || undefined;
    return {
      folder,
      public_id: originalName,
      resource_type: 'image',
    };
  },
});

const parser = multer({ storage });
const router = express.Router();

// Public endpoint for active sliders
router.get('/public', async (req, res) => {
  try {
    // Return active sliders newest-first
    const sliders = await Slider.find({ active: true }).sort({ createdAt: -1 });
    res.json(sliders);
  } catch (err) {
    console.error('Failed to fetch public sliders', err);
    res.status(500).json({ error: 'Failed to fetch sliders' });
  }
});

// Admin: list all sliders
router.get('/', authenticateToken, requirePermission('admin.view'), async (req, res) => {
  try {
    const sliders = await Slider.find().sort({ createdAt: -1 });
    res.json(sliders);
  } catch (err) {
    console.error('Failed to fetch sliders', err);
    res.status(500).json({ error: 'Failed to fetch sliders' });
  }
});

// Admin: create slider via JSON (image-only: only imageUrl/publicId/active accepted)
router.post('/', authenticateToken, requirePermission('admin.create'), async (req, res) => {
  try {
    const { imageUrl, publicId, active } = req.body;
    if (!imageUrl) return res.status(400).json({ error: 'imageUrl is required' });
    const slider = new Slider({ imageUrl, publicId, active: active === false ? false : true });
    await slider.save();
    res.status(201).json(slider);
  } catch (err) {
    console.error('Failed to create slider', err);
    res.status(500).json({ error: 'Failed to create slider' });
  }
});

// Admin: upload an image and create slider in one request (multipart/form-data, field `file`)
router.post('/upload', authenticateToken, requirePermission('admin.create'), parser.single('file'), async (req, res) => {
  try {
    if (!req.file || !req.file.path) return res.status(400).json({ error: 'No file uploaded' });
    const imageUrl = req.file.path;
    const publicId = req.file.filename || req.file.public_id || null;
    const { active } = req.body;
    const slider = new Slider({ imageUrl, publicId, active: active === 'false' ? false : (active === 'true' ? true : true) });
    await slider.save();
    res.status(201).json(slider);
  } catch (err) {
    console.error('Failed to upload slider', err);
    res.status(500).json({ error: 'Failed to upload slider' });
  }
});

// Admin: update slider
router.patch('/:id', authenticateToken, requirePermission('admin.edit'), async (req, res) => {
  try {
    // Only allow toggling active or updating imageUrl/publicId when necessary
    const allowed = ['active', 'imageUrl', 'publicId'];
    const updates = {};
    allowed.forEach(k => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });
    const slider = await Slider.findByIdAndUpdate(req.params.id, updates, { new: true });
    if (!slider) return res.status(404).json({ error: 'Slider not found' });
    res.json(slider);
  } catch (err) {
    console.error('Failed to update slider', err);
    res.status(500).json({ error: 'Failed to update slider' });
  }
});

// Admin: delete slider
router.delete('/:id', authenticateToken, requirePermission('admin.delete'), async (req, res) => {
  try {
    const slider = await Slider.findById(req.params.id);
    if (!slider) return res.status(404).json({ error: 'Slider not found' });

    // Attempt to delete from Cloudinary when publicId exists
    if (slider.publicId) {
      try {
        // Try destroy as image resource
        await cloudinary.uploader.destroy(slider.publicId, { invalidate: true, resource_type: 'image' });
      } catch (err) {
        console.warn('Cloudinary deletion failed for', slider.publicId, err.message || err);
      }
    }

    // Use findByIdAndDelete to ensure compatibility across mongoose versions
    await Slider.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error('Failed to delete slider', err);
    res.status(500).json({ error: 'Failed to delete slider' });
  }
});

export default router;
