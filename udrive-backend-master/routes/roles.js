import express from 'express';
import Role from '../models/role.js';
import Manager from '../models/manager.js';
import { authenticateToken, requirePermission } from './middleware.js';

const router = express.Router();

// List roles with optional user counts
router.get('/', async (req, res) => {
  try {
    const roles = await Role.find().lean();

    // Add user counts per role (managers collection)
    const rolesWithCounts = await Promise.all(roles.map(async (r) => {
      const count = await Manager.countDocuments({ role: r.id });
      return { ...r, userCount: count };
    }));

    res.json({ data: rolesWithCounts });
  } catch (err) {
    console.error('GET /roles error', err);
    res.status(500).json({ error: 'Failed to fetch roles' });
  }
});

// Get single role
router.get('/:id', async (req, res) => {
  try {
    const role = await Role.findOne({ id: req.params.id }).lean();
    if (!role) return res.status(404).json({ error: 'Role not found' });
    const userCount = await Manager.countDocuments({ role: role.id });
    res.json({ data: { ...role, userCount } });
  } catch (err) {
    console.error('GET /roles/:id error', err);
    res.status(500).json({ error: 'Failed to fetch role' });
  }
});

// Update role permissions (and optionally other metadata)
// Protected: requires authentication and admin.roles permission
router.put('/:id', authenticateToken, requirePermission('admin.roles'), async (req, res) => {
  const { permissions, name, description, color } = req.body;
  try {
    let role = await Role.findOne({ id: req.params.id });
    if (!role) return res.status(404).json({ error: 'Role not found' });

    if (Array.isArray(permissions)) role.permissions = permissions;
    if (name) role.name = name;
    if (description !== undefined) role.description = description;
    if (color) role.color = color;

    await role.save();

    const userCount = await Manager.countDocuments({ role: role.id });
    res.json({ data: { ...role.toObject(), userCount } });
  } catch (err) {
    console.error('PUT /roles/:id error', err);
    res.status(500).json({ error: 'Failed to update role' });
  }
});

export default router;
