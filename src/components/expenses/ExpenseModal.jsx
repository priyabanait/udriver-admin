import { useEffect, useState } from 'react';
import { Modal, ModalFooter } from '../ui/Modal';
import toast from 'react-hot-toast';

export default function ExpenseModal({ isOpen, onClose, onSave, expense = null, categories = [] }) {
  const [form, setForm] = useState({
    title: '',
    category: '',
    subcategory: '',
    amount: '',
    date: '',
    vendor: '',
    vehicleId: '',
    driverId: '',
    driverName: '',
    description: '',
    paymentMethod: 'bank_transfer',
    invoiceNumber: ''
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (expense) {
      setForm({
        title: expense.title || '',
        category: expense.category || '',
        subcategory: expense.subcategory || '',
        amount: expense.amount ?? '',
        date: expense.date ? expense.date.substring(0,10) : '',
        vendor: expense.vendor || '',
        vehicleId: expense.vehicleId || '',
        driverId: expense.driverId || '',
        driverName: expense.driverName || '',
        description: expense.description || '',
        paymentMethod: expense.paymentMethod || 'bank_transfer',
        invoiceNumber: expense.invoiceNumber || ''
      });
    } else {
      setForm(prev => ({ ...prev, date: new Date().toISOString().substring(0,10) }));
    }
    setErrors({});
  }, [expense, isOpen]);

  const setField = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const validate = () => {
    const e = {};
    if (!form.title?.trim()) e.title = 'Title is required';
    const amt = Number(form.amount);
    if (!amt || amt <= 0) e.amount = 'Amount must be greater than 0';
    if (!form.category) e.category = 'Category is required';
    if (!form.date) e.date = 'Date is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = {
        ...form,
        amount: Number(form.amount),
        date: form.date
      };
      await onSave(payload);
      toast.success(expense ? 'Expense updated' : 'Expense created');
      onClose();
    } catch (err) {
      // onSave should throw to handle here if needed
      toast.error(err?.message || 'Failed to save expense');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={expense ? 'Edit Expense' : 'Add Expense'}>
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
            <input className={`input ${errors.title ? 'border-red-300' : ''}`} value={form.title} onChange={(e)=>setField('title', e.target.value)} placeholder="Expense title" />
            {errors.title && <p className="mt-1 text-xs text-red-600">{errors.title}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₹) *</label>
            <input type="text" className={`input ${errors.amount ? 'border-red-300' : ''}`} value={form.amount} onChange={(e)=>setField('amount', e.target.value)} placeholder="0" />
            {errors.amount && <p className="mt-1 text-xs text-red-600">{errors.amount}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
            <select className={`input ${errors.category ? 'border-red-300' : ''}`} value={form.category} onChange={(e)=>setField('category', e.target.value)}>
              <option value="">Select category</option>
              {categories.map(c => (
                <option key={c.key} value={c.key}>{c.label}</option>
              ))}
            </select>
            {errors.category && <p className="mt-1 text-xs text-red-600">{errors.category}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Subcategory</label>
            <input className="input" value={form.subcategory} onChange={(e)=>setField('subcategory', e.target.value)} placeholder="e.g., General Service" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
            <input type="date" className={`input ${errors.date ? 'border-red-300' : ''}`} value={form.date} onChange={(e)=>setField('date', e.target.value)} />
            {errors.date && <p className="mt-1 text-xs text-red-600">{errors.date}</p>}
          </div>
          {/* <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Vendor</label>
            <input className="input" value={form.vendor} onChange={(e)=>setField('vendor', e.target.value)} placeholder="Vendor name" />
          </div> */}
          {/* <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
            <select className="input" value={form.paymentMethod} onChange={(e)=>setField('paymentMethod', e.target.value)}>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="cash">Cash</option>
              <option value="upi">UPI</option>
              <option value="card">Card</option>
            </select>
          </div> */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Invoice Number</label>
            <input className="input" value={form.invoiceNumber} onChange={(e)=>setField('invoiceNumber', e.target.value)} placeholder="INV-2025-001" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle</label>
            <input className="input" value={form.vehicleId} onChange={(e)=>setField('vehicleId', e.target.value)} placeholder="KA-05-AB-1234" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Driver ID</label>
            <input className="input" value={form.driverId} onChange={(e)=>setField('driverId', e.target.value)} placeholder="DR001" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Driver Name</label>
            <input className="input" value={form.driverName} onChange={(e)=>setField('driverName', e.target.value)} placeholder="Driver name" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea className="input" rows={3} value={form.description} onChange={(e)=>setField('description', e.target.value)} placeholder="Add notes or details" />
        </div>
      </div>

      <ModalFooter>
        <button className="btn btn-secondary" onClick={onClose} disabled={saving}>Cancel</button>
        <button className="btn btn-primary" onClick={handleSubmit} disabled={saving}>
          {saving ? 'Saving...' : (expense ? 'Update Expense' : 'Create Expense')}
        </button>
      </ModalFooter>
    </Modal>
  );
}
