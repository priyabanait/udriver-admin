import express from 'express';

const router = express.Router();

// Static investments matching the frontend's current state
let investments = [
  {
    id: 1,
    investorName: 'Rajesh Gupta',
    email: 'rajesh.gupta@email.com',
    phone: '+91-9876543210',
    planType: 'Premium Fleet Package',
    investmentAmount: 5000000,
    investmentDate: '2024-01-15',
    maturityDate: '2026-01-15',
    expectedReturn: 7500000,
    currentValue: 5850000,
    roi: 17.0,
    status: 'active',
    riskLevel: 'medium',
    paymentMethod: 'Bank Transfer',
    documents: ['agreement', 'kyc', 'bank_details']
  },
  {
    id: 2,
    investorName: 'Priya Sharma',
    email: 'priya.sharma@email.com',
    phone: '+91-9876543211',
    planType: 'Standard Vehicle Investment',
    investmentAmount: 2000000,
    investmentDate: '2024-03-20',
    maturityDate: '2025-09-20',
    expectedReturn: 2400000,
    currentValue: 2180000,
    roi: 9.0,
    status: 'active',
    riskLevel: 'low',
    paymentMethod: 'Digital Payment',
    documents: ['agreement', 'kyc']
  },
  {
    id: 3,
    investorName: 'Amit Singh',
    email: 'amit.singh@email.com',
    phone: '+91-9876543212',
    planType: 'Growth Plus Plan',
    investmentAmount: 8000000,
    investmentDate: '2023-11-10',
    maturityDate: '2025-11-10',
    expectedReturn: 10400000,
    currentValue: 9600000,
    roi: 20.0,
    status: 'active',
    riskLevel: 'high',
    paymentMethod: 'Bank Transfer',
    documents: ['agreement', 'kyc', 'bank_details', 'collateral']
  },
  {
    id: 4,
    investorName: 'Sunita Patel',
    email: 'sunita.patel@email.com',
    phone: '+91-9876543213',
    planType: 'Starter Investment Plan',
    investmentAmount: 1000000,
    investmentDate: '2024-06-15',
    maturityDate: '2025-06-15',
    expectedReturn: 1150000,
    currentValue: 1075000,
    roi: 7.5,
    status: 'matured',
    riskLevel: 'low',
    paymentMethod: 'Digital Payment',
    documents: ['agreement', 'kyc']
  }
];

// GET all investments
router.get('/', (req, res) => {
  res.json(investments);
});

// POST - Handle both fetching (no body) and creating (with body)
router.post('/', (req, res) => {
  // If request body has investment data, add new investment
  if (req.body && Object.keys(req.body).length > 0 && req.body.investorName) {
    try {
      // Generate new ID
      const newId = investments.length > 0 ? Math.max(...investments.map(inv => inv.id)) + 1 : 1;
      
      // Create new investment
      const newInvestment = {
        id: newId,
        ...req.body,
        documents: req.body.documents || []
      };
      
      // Add to investments array
      investments.push(newInvestment);
      
      // Return the new investment
      res.status(201).json(newInvestment);
    } catch (error) {
      console.error('Error adding investment:', error);
      res.status(400).json({ error: 'Failed to add investment', message: error.message });
    }
  } else {
    // If no body or empty body, return all investments (for fetching)
    res.json(investments);
  }
});

// PUT - Update an investment
router.put('/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const index = investments.findIndex(inv => inv.id === id);
  
  if (index === -1) {
    return res.status(404).json({ error: 'Investment not found' });
  }
  
  investments[index] = {
    ...investments[index],
    ...req.body,
    id: id // Ensure ID doesn't change
  };
  
  res.json(investments[index]);
});

// DELETE - Remove an investment
router.delete('/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const index = investments.findIndex(inv => inv.id === id);
  
  if (index === -1) {
    return res.status(404).json({ error: 'Investment not found' });
  }
  
  const deleted = investments.splice(index, 1)[0];
  res.json({ message: 'Investment deleted successfully', investment: deleted });
});

export default router;


