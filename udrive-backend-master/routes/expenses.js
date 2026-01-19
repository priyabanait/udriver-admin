import express from 'express';
import Expense from '../models/expense.js';

const router = express.Router();

function stripAuthFields(source) {
  if (!source || typeof source !== 'object') return {};
  const disallowed = new Set(['token', 'authToken', 'accessToken', 'authorization', 'Authorization', 'bearer', 'Bearer']);
  const cleaned = {};
  for (const [k, v] of Object.entries(source)) {
    if (!disallowed.has(k)) cleaned[k] = v;
  }
  return cleaned;
}

// Static categories endpoint (keys and labels only)
router.get('/categories', async (req, res) => {
  res.json([
    { key: 'fuel', label: 'Fuel' },
    { key: 'maintenance', label: 'Maintenance' },
    { key: 'insurance', label: 'Insurance' },
    { key: 'administrative', label: 'Administrative' },
    { key: 'salary', label: 'Salary & Benefits' },
    { key: 'marketing', label: 'Marketing' },
    { key: 'technology', label: 'Technology' },
    { key: 'other', label: 'Other' }
  ]);
});

// Search expenses endpoint
router.get('/search', async (req, res) => {
  try {
    const {
      q, // general search query
      title,
      vendor,
      description,
      category,
      status,
      minAmount,
      maxAmount,
      dateFrom,
      dateTo
    } = req.query;

    const filter = {};

    // General search across multiple fields
    if (q && q.trim()) {
      const searchRegex = new RegExp(q.trim(), 'i');
      filter.$or = [
        { title: searchRegex },
        { vendor: searchRegex },
        { description: searchRegex },
        { category: searchRegex }
      ];
    }

    // Specific field filters
    if (title) filter.title = new RegExp(title, 'i');
    if (vendor) filter.vendor = new RegExp(vendor, 'i');
    if (description) filter.description = new RegExp(description, 'i');
    if (category) filter.category = category;
    if (status) filter.status = status;

    // Amount range filter
    if (minAmount || maxAmount) {
      filter.amount = {};
      if (minAmount) filter.amount.$gte = Number(minAmount);
      if (maxAmount) filter.amount.$lte = Number(maxAmount);
    }

    // Date range filter
    if (dateFrom || dateTo) {
      filter.date = {};
      if (dateFrom) filter.date.$gte = new Date(dateFrom);
      if (dateTo) {
        const endDate = new Date(dateTo);
        endDate.setHours(23, 59, 59, 999);
        filter.date.$lte = endDate;
      }
    }

    // Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const sortBy = req.query.sortBy || 'createdAt';
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;

    const total = await Expense.countDocuments(filter);
    const list = await Expense.find(filter)
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
    console.error('Error searching expenses:', error);
    res.status(500).json({ message: 'Failed to search expenses', error: error.message });
  }
});

// List expenses
router.get('/', async (req, res) => {
  try {
    // Pagination parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const sortBy = req.query.sortBy || 'createdAt';
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;

    // Add search support to main GET endpoint
    const filter = {};
    if (req.query.q && req.query.q.trim()) {
      const searchRegex = new RegExp(req.query.q.trim(), 'i');
      filter.$or = [
        { title: searchRegex },
        { vendor: searchRegex },
        { description: searchRegex },
        { category: searchRegex }
      ];
    }
    if (req.query.category) filter.category = req.query.category;
    if (req.query.status) filter.status = req.query.status;

    const total = await Expense.countDocuments(filter);
    const list = await Expense.find(filter)
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
    console.error('Error fetching expenses:', error);
    res.status(500).json({ message: 'Failed to fetch expenses', error: error.message });
  }
});

// Get expense by id
router.get('/:id', async (req, res) => {
  const id = Number(req.params.id);
  const item = await Expense.findOne({ id }).lean();
  if (!item) return res.status(404).json({ message: 'Expense not found' });
  res.json(item);
});

// Create expense
router.post('/', async (req, res) => {
  try {
    const fields = stripAuthFields(req.body);
    const max = await Expense.find().sort({ id: -1 }).limit(1).lean();
    const nextId = (max[0]?.id || 0) + 1;

    const expenseData = { id: nextId, status: 'pending', ...fields };
    const created = await Expense.create(expenseData);
    // Notify dashboard
    try {
      const { createAndEmitNotification } = await import('../lib/notify.js');
      await createAndEmitNotification({
        type: 'expense',
        title: `Expense ${created.id} - ${created.category || ''}`,
        message: `Amount: ${created.amount || 0}`,
        data: { id: created._id, expenseId: created.id }
      });
    } catch (err) {
      console.warn('Notify failed:', err.message);
    }
    res.status(201).json(created);
  } catch (err) {
    console.error('Expense create error:', err);
    res.status(500).json({ message: 'Failed to create expense', error: err.message });
  }
});

// Update expense
router.put('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const fields = stripAuthFields(req.body);

    const updated = await Expense.findOneAndUpdate(
      { id },
      fields,
      { new: true }
    ).lean();

    if (!updated) return res.status(404).json({ message: 'Expense not found' });
    res.json(updated);
  } catch (err) {
    console.error('Expense update error:', err);
    res.status(500).json({ message: 'Failed to update expense', error: err.message });
  }
});

// Delete expense
router.delete('/:id', async (req, res) => {
  const id = Number(req.params.id);
  await Expense.deleteOne({ id });
  res.json({ message: 'Deleted' });
});

export default router;
