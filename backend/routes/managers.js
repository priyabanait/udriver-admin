import express from 'express';
import mongoose from 'mongoose'; // ✅ ADD THIS
import Manager from '../models/manager.js';
import ManagerSalary from '../models/managerSalary.js';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();
const router = express.Router();

const SECRET = process.env.JWT_SECRET || 'dev_secret';
// Manager login endpoint
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const manager = await Manager.findOne({ email, password });
    if (!manager) return res.status(401).json({ message: 'Invalid credentials' });

    const loginTime = new Date();
    const attendanceDate = new Date(loginTime);
    attendanceDate.setHours(0, 0, 0, 0); // Set to start of day

    // Update last login time (for backward compatibility)
    manager.lastLogin = loginTime;

    // Create new attendance record
    if (!manager.attendanceRecords) {
      manager.attendanceRecords = [];
    }
    
    // Check if there's an open session (login without logout) for today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayRecord = manager.attendanceRecords.find(record => {
      const recordDate = new Date(record.date);
      recordDate.setHours(0, 0, 0, 0);
      return recordDate.getTime() === today.getTime() && !record.logoutTime;
    });

    if (!todayRecord) {
      // Create new attendance record for today
      manager.attendanceRecords.push({
        loginTime: loginTime,
        logoutTime: null,
        date: attendanceDate,
        duration: null
      });
    } else {
      // Update existing record if login happens again on the same day
      todayRecord.loginTime = loginTime;
    }

    await manager.save();

    // Resolve permissions: prefer per-manager overrides, else role permissions, else default fleet manager permissions
    let permissions = Array.isArray(manager.permissions) && manager.permissions.length ? manager.permissions.slice() : [];

    // If no per-manager permissions, try fetching role's permissions from Role model
    if (!permissions.length && manager.role) {
      try {
        const Role = await import('../models/role.js');
        const roleDoc = await Role.default.findOne({ id: manager.role });
        if (roleDoc && Array.isArray(roleDoc.permissions) && roleDoc.permissions.length) {
          permissions = roleDoc.permissions.slice();
        }
      } catch (err) {
        // ignore role lookup failure and fall back to defaults
        console.warn('Failed to load role permissions for manager login:', err.message);
      }
    }

    // Fallback to sensible default permissions for fleet manager if nothing found
    if (!permissions.length) {
      permissions = [
        'dashboard.view',
        'dashboard.analytics',
        'drivers.view',
        'reports.export',
        'drivers.edit',
        'drivers.kyc',
        'drivers.performance',
        'vehicles.view',
        'vehicles.create',
        'vehicles.edit',
        'vehicles.assign',
        'plans.view',
        'plans.create',
        'plans.edit',
        'expenses:view',
        'expenses:create',
        'expenses:edit',
        'reports.view',
        'reports.performance',
        'tickets.view',
        'tickets.create',
        'tickets.edit',
        'investments:view',
        'investments:create',
        'investments:edit',
        'investments:delete',
        'investments:analytics',
        'payments.view',
        'payments.create',
        'payments.edit',
        'payments.process'
      ];
    }

    const payload = {
      id: manager._id,
      email: manager.email,
      name: manager.name,
      role: manager.role || 'fleet_manager',
      permissions,
      tokenVersion: manager.tokenVersion || 0
    };
    const token = jwt.sign(payload, SECRET, { expiresIn: '8h' });
    res.json({ user: payload, token });
  } catch (err) {
    console.error('Manager login error:', err);
    res.status(500).json({ message: 'Login failed', error: err.message });
  }
});

// Manager logout endpoint
router.post('/logout', async (req, res) => {
  try {
    const { managerId } = req.body;
    if (!managerId) {
      return res.status(400).json({ message: 'Manager ID is required' });
    }

    const manager = await Manager.findById(managerId);
    if (!manager) {
      return res.status(404).json({ message: 'Manager not found' });
    }

    const logoutTime = new Date();
    
    // Update last logout time (for backward compatibility)
    manager.lastLogout = logoutTime;

    // Find the most recent attendance record without logout time
    if (!manager.attendanceRecords) {
      manager.attendanceRecords = [];
    }

    // Find today's record or the most recent record without logout
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // First try to find today's record
    let recordToUpdate = manager.attendanceRecords.find(record => {
      const recordDate = new Date(record.date);
      recordDate.setHours(0, 0, 0, 0);
      return recordDate.getTime() === today.getTime() && !record.logoutTime;
    });

    // If not found, find the most recent record without logout
    if (!recordToUpdate) {
      const recordsWithoutLogout = manager.attendanceRecords
        .filter(record => !record.logoutTime)
        .sort((a, b) => new Date(b.loginTime) - new Date(a.loginTime));
      recordToUpdate = recordsWithoutLogout[0];
    }

    if (recordToUpdate) {
      recordToUpdate.logoutTime = logoutTime;
      // Calculate duration in minutes
      const durationMs = logoutTime - new Date(recordToUpdate.loginTime);
      recordToUpdate.duration = Math.floor(durationMs / 60000); // Convert to minutes
    } else {
      // If no open record found, create a new one (shouldn't happen normally)
      const attendanceDate = new Date();
      attendanceDate.setHours(0, 0, 0, 0);
      manager.attendanceRecords.push({
        loginTime: logoutTime, // Use logout time as fallback
        logoutTime: logoutTime,
        date: attendanceDate,
        duration: 0
      });
    }

    await manager.save();

    res.json({ message: 'Logout time recorded successfully' });
  } catch (err) {
    console.error('Manager logout error:', err);
    res.status(500).json({ message: 'Logout tracking failed', error: err.message });
  }
});

// Create a new manager
router.post('/', async (req, res) => {
  try {
    const { username, password, name, email, mobile, address, city, pincode, salary, status, department, serviceCategory, dob } = req.body;
    // Store password as plain text (not recommended for production)
    const manager = new Manager({
      username,
      password,
      name,
      email,
      mobile,
      address,
      city,
      pincode,
      salary,
      status,
      department,
      serviceCategory,
      dob
    });
    await manager.save();
    res.status(201).json({ message: 'Manager created successfully', manager });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get all managers
router.get('/', async (req, res) => {
  try {
    // Pagination parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const sortBy = req.query.sortBy || 'createdAt';
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;

    const total = await Manager.countDocuments();
    const managers = await Manager.find()
      .sort({ [sortBy]: sortOrder })
      .skip(skip)
      .limit(limit);
    
    res.json({
      data: managers,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasMore: page * limit < total
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all attendance records for all managers
router.get('/attendance', async (req, res) => {
  try {
    const { startDate, endDate, managerId } = req.query;
    
    // Build query
    const query = {};
    if (managerId) {
      query._id = managerId;
    }

    const managers = await Manager.find(query).select('_id name email mobile status department attendanceRecords');

    // Flatten attendance records with manager info
    let allRecords = [];
    
    managers.forEach(manager => {
      if (manager.attendanceRecords && manager.attendanceRecords.length > 0) {
        manager.attendanceRecords.forEach(record => {
          // Apply date filters if provided
          if (startDate || endDate) {
            const recordDate = new Date(record.date);
            if (startDate && recordDate < new Date(startDate)) return;
            if (endDate && recordDate > new Date(endDate)) return;
          }
          
          allRecords.push({
            id: manager._id,
            managerId: manager._id,
            name: manager.name,
            email: manager.email,
            mobile: manager.mobile,
            status: manager.status,
            department: manager.department,
            date: record.date,
            loginTime: record.loginTime,
            logoutTime: record.logoutTime,
            duration: record.duration,
            createdAt: record.createdAt
          });
        });
      }
    });

    // Sort by date (most recent first), then by login time
    allRecords.sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      if (dateB.getTime() !== dateA.getTime()) {
        return dateB - dateA;
      }
      const loginA = a.loginTime ? new Date(a.loginTime) : new Date(0);
      const loginB = b.loginTime ? new Date(b.loginTime) : new Date(0);
      return loginB - loginA;
    });

    res.json({
      data: allRecords,
      total: allRecords.length
    });
  } catch (error) {
    console.error('Error fetching attendance records:', error);
    res.status(500).json({ error: error.message });
  }
});

// (Optional) Get a single manager by ID
router.get('/:id', async (req, res) => {
  try {
    const manager = await Manager.findById(req.params.id);
    if (!manager) return res.status(404).json({ error: 'Manager not found' });
    res.json(manager);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// (Optional) Update a manager (supports permissions and role)
// NOTE: Changing a manager's `role` or `permissions` requires 'admin.roles' permission
import { authenticateToken, requirePermission } from './middleware.js';

// Conditionally enforce 'admin.roles' when request attempts to modify role/permissions
router.put('/:id',
  authenticateToken,
  (req, res, next) => {
    if (Object.prototype.hasOwnProperty.call(req.body, 'permissions') || Object.prototype.hasOwnProperty.call(req.body, 'role')) {
      return requirePermission('admin.roles')(req, res, next);
    }
    return next();
  },
  async (req, res) => {
    try {
      const updateData = { ...req.body };

      if (updateData.permissions && !Array.isArray(updateData.permissions)) {
        return res.status(400).json({ error: 'permissions must be an array' });
      }

      let manager;
      // If role or permissions are being changed, increment tokenVersion to invalidate existing tokens
      if (Object.prototype.hasOwnProperty.call(updateData, 'permissions') || Object.prototype.hasOwnProperty.call(updateData, 'role')) {
        manager = await Manager.findByIdAndUpdate(
          req.params.id,
          { $set: updateData, $inc: { tokenVersion: 1 } },
          { new: true }
        );
      } else {
        manager = await Manager.findByIdAndUpdate(req.params.id, updateData, { new: true });
      }

      if (!manager) return res.status(404).json({ error: 'Manager not found' });
      res.json(manager);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
);

// (Optional) Delete a manager
router.delete('/:id', async (req, res) => {
  try {
    const manager = await Manager.findByIdAndDelete(req.params.id);
    if (!manager) return res.status(404).json({ error: 'Manager not found' });
    res.json({ message: 'Manager deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Helper function to calculate salary summary
function calculateSalarySummary(attendanceMap = {}, month, year, monthlySalary = 0) {
  const daysInMonth = new Date(year, month, 0).getDate();

  let present = 0;
  let absent = 0;
  let halfDays = 0;
  let casualLeave = 0;
  let holiday = 0;
  let sunday = 0;
  let lop = 0;
  let totalWorkingDays = 0;

  // ✅ ENSURE OBJECT (VERY IMPORTANT)
  attendanceMap =
    attendanceMap && typeof attendanceMap === 'object'
      ? attendanceMap
      : {};

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month - 1, day);
    const dayOfWeek = date.getDay();

    // ✅ FIXED LINE (NO .get())
    const status = attendanceMap[day.toString()] || 'A';

    if (dayOfWeek === 0) {
      sunday++;
      continue;
    }

    totalWorkingDays++;

    if (status === 'P') present++;
    else if (status === 'H') halfDays++;
    else if (status === 'CL') casualLeave++;
    else if (status === 'HD') holiday++;
    else if (status === 'LOP') lop++;
    else absent++;
  }

  let totalSalary = 0;
  if (monthlySalary > 0 && totalWorkingDays > 0) {
    const salaryPerDay = monthlySalary / totalWorkingDays;
    const halfDaySalary = salaryPerDay / 2;
    const fullDays = present + casualLeave + holiday;

    totalSalary = (fullDays * salaryPerDay) + (halfDays * halfDaySalary);
    totalSalary = Math.round(totalSalary * 100) / 100;
  }

  return {
    present,
    absent,
    halfDays,
    casualLeave,
    holiday,
    sunday,
    lop,
    totalSalary
  };
}


// Get salary data for a manager for a specific month/year
router.get('/:id/salary/:month/:year', async (req, res) => {
  try {
    const { id, month, year } = req.params;
    const monthNum = parseInt(month);
    const yearNum = parseInt(year);
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid manager ID' });
    }
    
    // Check if manager exists
    const manager = await Manager.findById(id);
    if (!manager) {
      return res.status(404).json({ error: 'Manager not found' });
    }
    
    // Find or create salary record
    let salaryRecord = await ManagerSalary.findOne({
      managerId: id,
      month: monthNum,
      year: yearNum
    });
    
    // If no record exists, create one with default values
    if (!salaryRecord) {
      const daysInMonth = new Date(yearNum, monthNum, 0).getDate();
      const attendanceMap = new Map();
      
      // Initialize all days as absent, mark Sundays
      for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(yearNum, monthNum - 1, day);
        const dayOfWeek = date.getDay();
        if (dayOfWeek === 0) {
          attendanceMap.set(day.toString(), 'S');
        } else {
          attendanceMap.set(day.toString(), 'A');
        }
      }
      
      // Fetch attendance records for this month to populate present days
      const startDate = new Date(yearNum, monthNum - 1, 1);
      const endDate = new Date(yearNum, monthNum, 0);
      
      if (manager.attendanceRecords && manager.attendanceRecords.length > 0) {
        manager.attendanceRecords.forEach(record => {
          if (record.date) {
            const recordDate = new Date(record.date);
            if (recordDate >= startDate && recordDate <= endDate) {
              const day = recordDate.getDate();
              if (day >= 1 && day <= daysInMonth) {
                attendanceMap.set(day.toString(), 'P');
              }
            }
          }
        });
      }
      
      const summary = calculateSalarySummary(attendanceMap, monthNum, yearNum, manager.salary || 0);
      
      salaryRecord = new ManagerSalary({
        managerId: id,
        month: monthNum,
        year: yearNum,
        attendanceMap: Object.fromEntries(attendanceMap),
        salaryAmount: manager.salary || 0,
        summary
      });
      
      await salaryRecord.save();
    }
    
    // Convert attendanceMap from object to Map format for response
    const attendanceMapObj = salaryRecord.attendanceMap || {};
    const attendanceMap = new Map(Object.entries(attendanceMapObj));

    // Merge any recent attendanceRecords for this manager/month into the salary record
    // This ensures that if the manager logged in after a salary record was created,
    // the calendar will still show that day as Present ('P').
    if (manager.attendanceRecords && manager.attendanceRecords.length > 0) {
      const startDate = new Date(yearNum, monthNum - 1, 1);
      const endDate = new Date(yearNum, monthNum, 0);

      let changed = false;
      manager.attendanceRecords.forEach(record => {
        if (!record.date) return;
        const recordDate = new Date(record.date);
        if (recordDate >= startDate && recordDate <= endDate) {
          const day = recordDate.getDate();
          // Mark as Present for that day
          if (attendanceMap.get(day.toString()) !== 'P') {
            attendanceMap.set(day.toString(), 'P');
            changed = true;
          }
        }
      });

      if (changed) {
        // Persist the merged attendance map and recalculate summary
        salaryRecord.attendanceMap = Object.fromEntries(attendanceMap);
        salaryRecord.summary = calculateSalarySummary(salaryRecord.attendanceMap, monthNum, yearNum, salaryRecord.salaryAmount || manager.salary || 0);
        try {
          await salaryRecord.save();
        } catch (err) {
          console.warn('Failed to save merged salary attendance:', err.message);
        }
      }
    }

    res.json({
      data: {
        managerId: salaryRecord.managerId,
        month: salaryRecord.month,
        year: salaryRecord.year,
        attendanceMap: Object.fromEntries(attendanceMap),
        salaryAmount: salaryRecord.salaryAmount,
        summary: salaryRecord.summary
      }
    });
  } catch (error) {
    console.error('Error fetching salary data:', error);
    res.status(500).json({ error: error.message });
  }
});

// Save/Update salary data for a manager for a specific month/year
router.post('/:id/salary/:month/:year', async (req, res) => {
  try {
    const { id, month, year } = req.params;
    const { attendanceMap, salaryAmount } = req.body;
    const monthNum = parseInt(month);
    const yearNum = parseInt(year);
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid manager ID' });
    }
    
    // Check if manager exists
    const manager = await Manager.findById(id);
    if (!manager) {
      return res.status(404).json({ error: 'Manager not found' });
    }
    
    // Convert attendanceMap to Map if it's an object
    let attendanceMapObj = attendanceMap;
    if (attendanceMap && typeof attendanceMap === 'object' && !(attendanceMap instanceof Map)) {
      attendanceMapObj = attendanceMap;
    }
    
    // Calculate summary
    const summary = calculateSalarySummary(attendanceMapObj, monthNum, yearNum, salaryAmount || 0);
    
    // Find or create salary record
    let salaryRecord = await ManagerSalary.findOne({
      managerId: id,
      month: monthNum,
      year: yearNum
    });
    
    if (salaryRecord) {
      // Update existing record
      salaryRecord.attendanceMap = attendanceMapObj;
      salaryRecord.salaryAmount = salaryAmount || 0;
      salaryRecord.summary = summary;
      await salaryRecord.save();
    } else {
      // Create new record
      salaryRecord = new ManagerSalary({
        managerId: id,
        month: monthNum,
        year: yearNum,
        attendanceMap: attendanceMapObj,
        salaryAmount: salaryAmount || 0,
        summary
      });
      await salaryRecord.save();
    }
    
    // Also update manager's base salary if provided
    if (salaryAmount && salaryAmount !== manager.salary) {
      manager.salary = salaryAmount;
      await manager.save();
    }
    
    res.json({
      message: 'Salary data saved successfully',
      data: {
        managerId: salaryRecord.managerId,
        month: salaryRecord.month,
        year: salaryRecord.year,
        attendanceMap: Object.fromEntries(new Map(Object.entries(salaryRecord.attendanceMap || {}))),
        salaryAmount: salaryRecord.salaryAmount,
        summary: salaryRecord.summary
      }
    });
  } catch (error) {
    console.error('Error saving salary data:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update attendance for a specific day
router.put('/:id/salary/:month/:year/attendance', async (req, res) => {
  try {
    const { id, month, year } = req.params;
    const { attendanceMap } = req.body;

    const monthNum = parseInt(month);
    const yearNum = parseInt(year);

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid manager ID' });
    }

    if (!attendanceMap || typeof attendanceMap !== 'object') {
      return res.status(400).json({ error: 'attendanceMap is required' });
    }

    const validStatuses = ['P', 'A', 'H', 'CL', 'HD', 'S', 'LOP'];

    const manager = await Manager.findById(id);
    if (!manager) {
      return res.status(404).json({ error: 'Manager not found' });
    }

    let salaryRecord = await ManagerSalary.findOne({
      managerId: id,
      month: monthNum,
      year: yearNum
    });

    // Create salary record if not exists
    if (!salaryRecord) {
      const daysInMonth = new Date(yearNum, monthNum, 0).getDate();
      const initialMap = {};

      for (let d = 1; d <= daysInMonth; d++) {
        const date = new Date(yearNum, monthNum - 1, d);
        initialMap[d.toString()] = date.getDay() === 0 ? 'S' : 'A';
      }

      salaryRecord = new ManagerSalary({
        managerId: id,
        month: monthNum,
        year: yearNum,
        attendanceMap: initialMap,
        salaryAmount: manager.salary || 0
      });
    }

    // ✅ UPDATE MULTIPLE DAYS WITH DIFFERENT STATUS
    Object.entries(attendanceMap).forEach(([day, status]) => {
      if (validStatuses.includes(status)) {
        salaryRecord.attendanceMap[day.toString()] = status;
      }
    });

    // Recalculate salary
    salaryRecord.summary = calculateSalarySummary(
      salaryRecord.attendanceMap,
      monthNum,
      yearNum,
      salaryRecord.salaryAmount || 0
    );

    await salaryRecord.save();

    res.json({
      message: 'Attendance updated successfully',
      data: {
        managerId: salaryRecord.managerId,
        month: salaryRecord.month,
        year: salaryRecord.year,
        attendanceMap: salaryRecord.attendanceMap,
        summary: salaryRecord.summary
      }
    });
  } catch (error) {
    console.error('Error updating attendance:', error);
    res.status(500).json({ error: error.message });
  }
});


export default router;
