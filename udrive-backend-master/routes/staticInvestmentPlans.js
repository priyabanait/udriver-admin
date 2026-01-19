import express from 'express';

const router = express.Router();

// Static investment plans matching the frontend's current state
let investmentPlans = [
  {
    id: 1,
    name: 'Starter Investment Plan',
    minAmount: 100000,
    maxAmount: 1500000,
    duration: 12,
    expectedROI: 8.5,
    riskLevel: 'low',
    features: ['Basic vehicle allocation', 'Monthly returns', 'Insurance coverage'],
    active: true
  },
  {
    id: 2,
    name: 'Standard Vehicle Investment',
    minAmount: 1500000,
    maxAmount: 3000000,
    duration: 18,
    expectedROI: 12.0,
    riskLevel: 'medium',
    features: ['Premium vehicle allocation', 'Bi-weekly returns', 'Full insurance', 'Priority support'],
    active: true
  },
  {
    id: 3,
    name: 'Premium Fleet Package',
    minAmount: 3000000,
    maxAmount: 8000000,
    duration: 24,
    expectedROI: 15.0,
    riskLevel: 'medium',
    features: ['Luxury vehicle allocation', 'Weekly returns', 'Comprehensive insurance', 'Dedicated manager'],
    active: true
  },
  {
    id: 4,
    name: 'Growth Plus Plan',
    minAmount: 5000000,
    maxAmount: 20000000,
    duration: 36,
    expectedROI: 18.5,
    riskLevel: 'high',
    features: ['Fleet ownership', 'Daily returns', 'Premium insurance', 'Investment advisory'],
    active: true
  }
];

// GET all plans
router.get('/', (req, res) => {
  res.json(investmentPlans);
});

// POST - Handle both fetching and creating
router.post('/', (req, res) => {
  // If request body has plan data, add new plan
  if (req.body && Object.keys(req.body).length > 0 && req.body.name) {
    try {
      // Generate new ID
      const newId = investmentPlans.length > 0 ? Math.max(...investmentPlans.map(p => p.id)) + 1 : 1;
      
      // Create new plan
      const newPlan = {
        id: newId,
        ...req.body,
        active: req.body.active !== undefined ? req.body.active : true,
        features: req.body.features || []
      };
      
      // Add to plans array
      investmentPlans.push(newPlan);
      
      // Return the new plan
      res.status(201).json(newPlan);
    } catch (error) {
      console.error('Error adding plan:', error);
      res.status(400).json({ error: 'Failed to add plan', message: error.message });
    }
  } else {
    // If no body or empty body, return all plans (for fetching)
    res.json(investmentPlans);
  }
});

// PUT - Update a plan
router.put('/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const index = investmentPlans.findIndex(plan => plan.id === id);
  
  if (index === -1) {
    return res.status(404).json({ error: 'Investment plan not found' });
  }
  
  investmentPlans[index] = {
    ...investmentPlans[index],
    ...req.body,
    id: id // Ensure ID doesn't change
  };
  
  res.json(investmentPlans[index]);
});

// DELETE - Remove a plan
router.delete('/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const index = investmentPlans.findIndex(plan => plan.id === id);
  
  if (index === -1) {
    return res.status(404).json({ error: 'Investment plan not found' });
  }
  
  const deleted = investmentPlans.splice(index, 1)[0];
  res.json({ message: 'Investment plan deleted successfully', plan: deleted });
});

export default router;


