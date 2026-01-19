import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Role from '../models/role.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) throw new Error('MONGODB_URI not set');

const defaultRoles = [
  {
    id: 'super_admin', name: 'Super Admin', description: 'Full access to all features', color: 'red',
    permissions: [] // leave empty to be filled by admin or by copying from frontend
  },
  {
    id: 'fleet_manager', name: 'Manager', description: 'Manage drivers and fleet', color: 'blue', permissions: []
  },
  {
    id: 'finance_admin', name: 'Finance Admin', description: 'Finance and payments', color: 'green', permissions: []
  },
  { id: 'hr_manager', name: 'HR Manager', description: 'HR and attendance', color: 'purple', permissions: [] },
  { id: 'operations_manager', name: 'Operations Manager', description: 'Operations and tickets', color: 'orange', permissions: [] },
  { id: 'support_agent', name: 'Support Agent', description: 'Customer support', color: 'indigo', permissions: [] },
  { id: 'auditor', name: 'Auditor', description: 'View only', color: 'gray', permissions: [] }
];

async function seed() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to DB for seeding roles');

  for (const r of defaultRoles) {
    const existing = await Role.findOne({ id: r.id });
    if (!existing) {
      await Role.create(r);
      console.log('Inserted role', r.id);
    } else {
      console.log('Role exists', r.id);
    }
  }

  await mongoose.disconnect();
  console.log('Seeding complete');
}

seed().catch(err => { console.error(err); process.exit(1); });
