import express from 'express';
import DriverEnrollment from '../models/driverEnrollment.js';
import Driver from '../models/driver.js';
import DriverPlan from '../models/driverPlan.js';

const router = express.Router();

// Initial seed data (will be used if database is empty)
const seedData = [
  {
    id: 1,
    driverId: 'DR001',
    driverName: 'Rajesh Kumar',
    phone: '+91-9876543210',
    planId: 2,
    planName: 'Standard Plan',
    enrolledDate: '2024-08-15',
    status: 'active',
    monthlyFee: 8000,
    commissionRate: 18,
    vehicleAssigned: 'KA-05-AB-1234',
    performanceRating: 4.7,
    totalEarnings: 45000,
    lastPayment: '2024-10-15'
  },
  {
    id: 2,
    driverId: 'DR002',
    driverName: 'Priya Sharma',
    phone: '+91-9876543211',
    planId: 3,
    planName: 'Premium Plan',
    enrolledDate: '2024-09-01',
    status: 'active',
    monthlyFee: 12000,
    commissionRate: 15,
    vehicleAssigned: 'KA-05-CD-5678',
    performanceRating: 4.9,
    totalEarnings: 65000,
    lastPayment: '2024-10-20'
  },
  {
    id: 3,
    driverId: 'DR003',
    driverName: 'Amit Singh',
    phone: '+91-9876543212',
    planId: 1,
    planName: 'Economy Plan',
    enrolledDate: '2024-07-20',
    status: 'active',
    monthlyFee: 5000,
    commissionRate: 20,
    vehicleAssigned: 'KA-05-EF-9012',
    performanceRating: 4.5,
    totalEarnings: 32000,
    lastPayment: '2024-10-18'
  },
  {
    id: 4,
    driverId: 'DR004',
    driverName: 'Sunita Patel',
    phone: '+91-9876543213',
    planId: 2,
    planName: 'Standard Plan',
    enrolledDate: '2024-09-10',
    status: 'active',
    monthlyFee: 8000,
    commissionRate: 18,
    vehicleAssigned: 'KA-05-GH-3456',
    performanceRating: 4.6,
    totalEarnings: 38000,
    lastPayment: '2024-10-22'
  },
  {
    id: 5,
    driverId: 'DR005',
    driverName: 'Vikram Reddy',
    phone: '+91-9876543214',
    planId: 3,
    planName: 'Premium Plan',
    enrolledDate: '2024-08-01',
    status: 'active',
    monthlyFee: 12000,
    commissionRate: 15,
    vehicleAssigned: 'KA-05-IJ-7890',
    performanceRating: 4.8,
    totalEarnings: 58000,
    lastPayment: '2024-10-25'
  },
  {
    id: 6,
    driverId: 'DR006',
    driverName: 'Meena Devi',
    phone: '+91-9876543215',
    planId: 1,
    planName: 'Economy Plan',
    enrolledDate: '2024-10-01',
    status: 'pending',
    monthlyFee: 5000,
    commissionRate: 20,
    vehicleAssigned: '',
    performanceRating: 0,
    totalEarnings: 0,
    lastPayment: ''
  }
];

// GET all driver enrollments
router.get('/', async (req, res) => {
  try {
    let enrollments = await DriverEnrollment.find().lean();
    
    // If no enrollments exist in DB, create them from actual drivers
    if (enrollments.length === 0) {
      const drivers = await Driver.find().lean();
      const plans = await DriverPlan.find().lean();
      
      if (drivers.length > 0) {
        // Create enrollments from existing drivers
        const enrollmentsToCreate = drivers.map((driver, index) => {
          // Match driver's plan or use a default
          const driverPlan = plans.find(p => p.name === driver.currentPlan) || plans[0] || {
            name: driver.currentPlan || 'Standard Plan',
            amount: driver.planAmount || 8000,
            commissionRate: 18
          };
          
          return {
            id: index + 1,
            driverId: driver.licenseNumber || `DR${String(driver.id).padStart(3, '0')}`,
            driverName: driver.name,
            phone: driver.phone,
            planId: driverPlan.id || index + 1,
            planName: driverPlan.name || driver.currentPlan || 'Standard Plan',
            enrolledDate: driver.joinDate || new Date().toISOString().slice(0, 10),
            status: driver.status || 'active',
            monthlyFee: driverPlan.amount || driver.planAmount || 8000,
            commissionRate: driverPlan.commissionRate || 18,
            vehicleAssigned: driver.vehicleAssigned || '',
            performanceRating: driver.rating || 4.5,
            totalEarnings: driver.totalEarnings || 0,
            lastPayment: driver.lastActive || new Date().toISOString().slice(0, 10)
          };
        });
        
        // Insert into database
        await DriverEnrollment.insertMany(enrollmentsToCreate);
        enrollments = await DriverEnrollment.find().lean();
      } else {
        // If no drivers exist, use seed data
        await DriverEnrollment.insertMany(seedData);
        enrollments = await DriverEnrollment.find().lean();
      }
    }
    
    res.json(enrollments);
  } catch (err) {
    console.error('Error fetching driver enrollments:', err);
    res.status(500).json({ message: 'Failed to fetch driver enrollments', error: err.message });
  }
});

// GET single driver enrollment by id
router.get('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const enrollment = await DriverEnrollment.findOne({ id }).lean();
    
    if (!enrollment) {
      return res.status(404).json({ message: 'Driver enrollment not found' });
    }
    
    res.json(enrollment);
  } catch (err) {
    console.error('Error fetching driver enrollment:', err);
    res.status(500).json({ message: 'Failed to fetch driver enrollment', error: err.message });
  }
});

// CREATE new driver enrollment
router.post('/', async (req, res) => {
  try {
    // Get the highest id and increment
    const maxEnrollment = await DriverEnrollment.find().sort({ id: -1 }).limit(1).lean();
    const nextId = (maxEnrollment[0]?.id || 0) + 1;
    
    const enrollmentData = {
      id: nextId,
      ...req.body
    };
    
    const newEnrollment = await DriverEnrollment.create(enrollmentData);
    // Notify dashboard
    try {
      const { createAndEmitNotification } = await import('../lib/notify.js');
      await createAndEmitNotification({
        type: 'driver_enrollment',
        title: `Driver enrollment ${newEnrollment.id}`,
        message: `${newEnrollment.name || ''}`,
        data: { id: newEnrollment._id, enrollmentId: newEnrollment.id }
      });
    } catch (err) {
      console.warn('Notify failed:', err.message);
    }
    res.status(201).json(newEnrollment);
  } catch (err) {
    console.error('Error creating driver enrollment:', err);
    res.status(500).json({ message: 'Failed to create driver enrollment', error: err.message });
  }
});

// UPDATE driver enrollment
router.put('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const updatedEnrollment = await DriverEnrollment.findOneAndUpdate(
      { id },
      req.body,
      { new: true }
    ).lean();
    
    if (!updatedEnrollment) {
      return res.status(404).json({ message: 'Driver enrollment not found' });
    }
    
    res.json(updatedEnrollment);
  } catch (err) {
    console.error('Error updating driver enrollment:', err);
    res.status(500).json({ message: 'Failed to update driver enrollment', error: err.message });
  }
});

// DELETE driver enrollment
router.delete('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const deletedEnrollment = await DriverEnrollment.findOneAndDelete({ id });
    
    if (!deletedEnrollment) {
      return res.status(404).json({ message: 'Driver enrollment not found' });
    }
    
    res.json({ message: 'Driver enrollment deleted successfully' });
  } catch (err) {
    console.error('Error deleting driver enrollment:', err);
    res.status(500).json({ message: 'Failed to delete driver enrollment', error: err.message });
  }
});

// SYNC enrollments from current driver data
router.post('/sync', async (req, res) => {
  try {
    const drivers = await Driver.find().lean();
    const plans = await DriverPlan.find().lean();
    
    if (drivers.length === 0) {
      return res.status(400).json({ message: 'No drivers found to sync' });
    }
    
    // Clear existing enrollments
    await DriverEnrollment.deleteMany({});
    
    // Create enrollments from current drivers
    const enrollmentsToCreate = drivers.map((driver, index) => {
      const driverPlan = plans.find(p => p.name === driver.currentPlan) || plans[0] || {
        name: driver.currentPlan || 'Standard Plan',
        amount: driver.planAmount || 8000,
        commissionRate: 18
      };
      
      return {
        id: index + 1,
        driverId: driver.licenseNumber || `DR${String(driver.id).padStart(3, '0')}`,
        driverName: driver.name,
        phone: driver.phone,
        planId: driverPlan.id || index + 1,
        planName: driverPlan.name || driver.currentPlan || 'Standard Plan',
        enrolledDate: driver.joinDate || new Date().toISOString().slice(0, 10),
        status: driver.status || 'active',
        monthlyFee: driverPlan.amount || driver.planAmount || 8000,
        commissionRate: driverPlan.commissionRate || 18,
        vehicleAssigned: driver.vehicleAssigned || '',
        performanceRating: driver.rating || 4.5,
        totalEarnings: driver.totalEarnings || 0,
        lastPayment: driver.lastActive || new Date().toISOString().slice(0, 10)
      };
    });
    
    await DriverEnrollment.insertMany(enrollmentsToCreate);
    const enrollments = await DriverEnrollment.find().lean();
    
    res.json({ 
      message: 'Enrollments synced successfully', 
      count: enrollments.length,
      enrollments 
    });
  } catch (err) {
    console.error('Error syncing driver enrollments:', err);
    res.status(500).json({ message: 'Failed to sync driver enrollments', error: err.message });
  }
});

export default router;
