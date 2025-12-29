import mongoose from 'mongoose';

const managerSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  mobile: { type: String, required: true },
  address: { type: String },
  city: { type: String },
  pincode: { type: String },
  salary: { type: Number },
  status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
department: {
  type: String,
  enum: ['Manager', 'HR', 'Onboard Team'],
  required: true
},
  serviceCategory: { type: String },
  dob: { type: Date },
  lastLogin: { type: Date }, // Track last login time (for backward compatibility)
  lastLogout: { type: Date }, // Track last logout time (for backward compatibility)
  // Manager role (e.g., 'fleet_manager', 'hr_manager')
  role: { type: String },

  // Per-manager permission overrides (if empty, role permissions apply)
  permissions: { type: [String], default: [] },

  // Token version to support immediate session invalidation when permissions/role change
  tokenVersion: { type: Number, default: 0 },

  // Array to store all historical attendance records
  attendanceRecords: [{
    loginTime: { type: Date, required: true },
    logoutTime: { type: Date },
    date: { type: Date, required: true }, // Date of attendance (YYYY-MM-DD)
    duration: { type: Number }, // Duration in minutes
    createdAt: { type: Date, default: Date.now }
  }]
}, { timestamps: true });

const Manager = mongoose.model('Manager', managerSchema);
export default Manager;
