import { connectDB } from '../db.js';
import Expense from '../models/expense.js';

async function seed() {
  await connectDB();

  const samples = [
    {
      title: 'Vehicle Maintenance - KA-05-AB-1234',
      category: 'maintenance',
      subcategory: 'General Service',
      amount: 15000,
      date: '2024-10-25',
      vendor: 'City Auto Service',
      vehicleId: 'KA-05-AB-1234',
      driverId: 'DR001',
      driverName: 'Rajesh Kumar',
      description: 'Full service including oil change, brake pad replacement',
      status: 'approved',
      receiptUrl: 'receipt1.pdf',
      approvedBy: 'Admin',
      approvedDate: '2024-10-25',
      paymentMethod: 'bank_transfer',
      invoiceNumber: 'INV-2024-001'
    },
    {
      title: 'Fuel Expense - Multiple Vehicles',
      category: 'fuel',
      subcategory: 'Petrol',
      amount: 25000,
      date: '2024-10-24',
      vendor: 'Shell Petrol Pump',
      vehicleId: 'Multiple',
      driverId: null,
      driverName: null,
      description: 'Bulk fuel purchase for fleet vehicles',
      status: 'pending',
      receiptUrl: 'receipt2.pdf',
      approvedBy: null,
      approvedDate: null,
      paymentMethod: 'cash',
      invoiceNumber: 'FUEL-2024-025'
    },
    {
      title: 'Office Rent - October 2024',
      category: 'administrative',
      subcategory: 'Rent',
      amount: 50000,
      date: '2024-10-01',
      vendor: 'Property Management Co.',
      vehicleId: null,
      driverId: null,
      driverName: null,
      description: 'Monthly office rent payment',
      status: 'approved',
      receiptUrl: 'receipt3.pdf',
      approvedBy: 'Finance Admin',
      approvedDate: '2024-10-01',
      paymentMethod: 'bank_transfer',
      invoiceNumber: 'RENT-2024-10'
    },
    {
      title: 'Insurance Premium - Vehicle Fleet',
      category: 'insurance',
      subcategory: 'Vehicle Insurance',
      amount: 120000,
      date: '2024-10-15',
      vendor: 'National Insurance Co.',
      vehicleId: 'Fleet',
      driverId: null,
      driverName: null,
      description: 'Quarterly insurance premium for 50 vehicles',
      status: 'approved',
      receiptUrl: 'receipt4.pdf',
      approvedBy: 'Super Admin',
      approvedDate: '2024-10-15',
      paymentMethod: 'bank_transfer',
      invoiceNumber: 'INS-2024-Q4'
    },
    {
      title: 'Driver Salary - Support Staff',
      category: 'salary',
      subcategory: 'Support Staff',
      amount: 45000,
      date: '2024-10-30',
      vendor: 'HR Department',
      vehicleId: null,
      driverId: 'Multiple',
      driverName: 'Support Staff',
      description: 'Monthly salary for support and admin staff',
      status: 'rejected',
      receiptUrl: null,
      approvedBy: null,
      approvedDate: null,
      paymentMethod: 'bank_transfer',
      invoiceNumber: 'SAL-2024-10'
    }
  ];

  // Determine next id
  const max = await Expense.find().sort({ id: -1 }).limit(1).lean();
  let nextId = (max[0]?.id || 0) + 1;

  for (const s of samples) {
    // Avoid duplicates by invoiceNumber if present
    const exists = s.invoiceNumber ? await Expense.findOne({ invoiceNumber: s.invoiceNumber }) : null;
    if (exists) {
      console.log(`Skipping existing expense ${s.invoiceNumber}`);
      continue;
    }
    const created = await Expense.create({ id: nextId++, ...s });
    console.log('Created expense:', created.title);
  }

  console.log('Expenses seeding completed');
  process.exit(0);
}

seed().catch(err => {
  console.error('Seed failed', err);
  process.exit(1);
});
