import express from 'express';
import InvestmentPlan from '../models/investmentPlan.js';

const router = express.Router();

// Search/filter investment plans
router.get('/search', async (req, res) => {
  try {
    const {
      q, // general search query
      name,
      riskLevel,
      minAmount,
      maxAmount,
      minDuration,
      maxDuration,
      minROI,
      maxROI,
      category
    } = req.query;

    const filter = {};

    // General search across multiple fields
    if (q && q.trim()) {
      const searchRegex = new RegExp(q.trim(), 'i');
      filter.$or = [
        { name: searchRegex },
        { description: searchRegex },
        { category: searchRegex },
        { features: searchRegex }
      ];
    }

    // Specific field filters
    if (name) filter.name = new RegExp(name, 'i');
    if (riskLevel) filter.riskLevel = riskLevel;
    if (category) filter.category = new RegExp(category, 'i');

    // Amount range filters
    if (minAmount || maxAmount) {
      filter.minAmount = {};
      if (minAmount) filter.minAmount.$gte = Number(minAmount);
      if (maxAmount) filter.minAmount.$lte = Number(maxAmount);
    }

    // Duration range filters
    if (minDuration || maxDuration) {
      filter.duration = {};
      if (minDuration) filter.duration.$gte = Number(minDuration);
      if (maxDuration) filter.duration.$lte = Number(maxDuration);
    }

    // ROI range filters
    if (minROI || maxROI) {
      filter.expectedROI = {};
      if (minROI) filter.expectedROI.$gte = Number(minROI);
      if (maxROI) filter.expectedROI.$lte = Number(maxROI);
    }

    const plans = await InvestmentPlan.find(filter).lean();
    
    // Transform _id to id for frontend compatibility
    const transformedPlans = plans.map(plan => ({
      ...plan,
      id: plan._id.toString()
    }));
    
    res.json(transformedPlans);
  } catch (err) {
    console.error('Error searching investment plans:', err);
    res.status(500).json({ message: 'Failed to search investment plans' });
  }
});

// GET all investment plans
router.get('/', async (req, res) => {
  try {
    const list = await InvestmentPlan.find().lean();
    // Transform _id to id for frontend compatibility
    const transformedList = list.map(plan => ({
      ...plan,
      id: plan._id.toString()
    }));
    res.json(transformedList);
  } catch (error) {
    console.error('Error fetching investment plans:', error);
    res.status(500).json({ error: 'Failed to fetch investment plans', message: error.message });
  }
});

// POST - Create new investment plan
router.post('/', async (req, res) => {
  try {
    const newPlan = new InvestmentPlan(req.body);
    const saved = await newPlan.save();
    const result = {
      ...saved.toObject(),
      id: saved._id.toString()
    };
    res.status(201).json(result);
  } catch (error) {
    console.error('Error creating investment plan:', error);
    res.status(400).json({ error: 'Failed to create investment plan', message: error.message });
  }
});

// PUT - Update investment plan
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updated = await InvestmentPlan.findByIdAndUpdate(
      id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!updated) {
      return res.status(404).json({ error: 'Investment plan not found' });
    }
    
    const result = {
      ...updated.toObject(),
      id: updated._id.toString()
    };
    res.json(result);
  } catch (error) {
    console.error('Error updating investment plan:', error);
    res.status(400).json({ error: 'Failed to update investment plan', message: error.message });
  }
});

// DELETE - Remove investment plan
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await InvestmentPlan.findByIdAndDelete(id);
    
    if (!deleted) {
      return res.status(404).json({ error: 'Investment plan not found' });
    }
    
    res.json({ message: 'Investment plan deleted successfully', plan: deleted });
  } catch (error) {
    console.error('Error deleting investment plan:', error);
    res.status(400).json({ error: 'Failed to delete investment plan', message: error.message });
  }
});

export default router;
