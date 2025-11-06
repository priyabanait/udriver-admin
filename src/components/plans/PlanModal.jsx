import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import toast from 'react-hot-toast';

export default function PlanModal({ isOpen, onClose, initial = null, onSave, apiPath = '/api/driver-plans' }) {
  const [form, setForm] = useState({
    name: '',
    category: 'economy',
    monthlyFee: 0,
    commissionRate: 0,
    vehicleTypes: '', // comma separated
    features: '', // comma separated
    status: 'active'
  });

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (initial) {
      setForm({
        name: initial.name || '',
        category: initial.category || 'economy',
        monthlyFee: initial.monthlyFee || 0,
        commissionRate: initial.commissionRate || 0,
        vehicleTypes: (initial.vehicleTypes || []).join(', '),
        features: (initial.features || []).join(', '),
        status: initial.status || 'active'
      });
    } else {
      setForm({ name: '', category: 'economy', monthlyFee: 0, commissionRate: 0, vehicleTypes: '', features: '', status: 'active' });
    }
  }, [initial, isOpen]);

  if (!isOpen) return null;

  const handleChange = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const handleSubmit = async () => {
    if (!form.name.trim()) return toast.error('Plan name is required');
    try {
      setSaving(true);
  const API_BASE = import.meta.env.VITE_API_BASE || 'https://udrive-backend-mcrx.vercel.app';
      const token = localStorage.getItem('udriver_token') || 'mock';
      const payload = {
        name: form.name,
        category: form.category,
        monthlyFee: Number(form.monthlyFee) || 0,
        commissionRate: Number(form.commissionRate) || 0,
        vehicleTypes: form.vehicleTypes.split(',').map(s => s.trim()).filter(Boolean),
        features: form.features.split(',').map(s => s.trim()).filter(Boolean),
        status: form.status,
        createdDate: new Date().toISOString()
      };

      let res;
      // use apiPath prop so this modal can be reused for different plan endpoints
      const basePath = apiPath.startsWith('/') ? apiPath : `/${apiPath}`;
      if (initial && (initial.id || initial._id)) {
        const id = initial.id || initial._id;
        res = await fetch(`${API_BASE}${basePath}/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(payload)
        });
      } else {
        res = await fetch(`${API_BASE}${basePath}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(payload)
        });
      }

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.message || `Failed to save: ${res.status}`);
      }

      const saved = await res.json();
      onSave && onSave(saved);
      toast.success(initial ? 'Plan updated' : 'Plan created');
      onClose();
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Failed to save plan');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={onClose} />
        <div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between p-4 border-b">
            <h3 className="text-lg font-medium">{initial ? 'Edit Plan' : 'Create Plan'}</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5"/></button>
          </div>
          <div className="p-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Name</label>
              <input value={form.name} onChange={e=>handleChange('name', e.target.value)} className="input w-full" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Category</label>
                <select value={form.category} onChange={e=>handleChange('category', e.target.value)} className="input w-full">
                  <option value="economy">Economy</option>
                  <option value="standard">Standard</option>
                  <option value="premium">Premium</option>
                  <option value="elite">Elite</option>
                  <option value="trial">Trial</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Status</label>
                <select value={form.status} onChange={e=>handleChange('status', e.target.value)} className="input w-full">
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Monthly Fee</label>
                <input type="number" value={form.monthlyFee} onChange={e=>handleChange('monthlyFee', e.target.value)} className="input w-full" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Commission Rate (%)</label>
                <input type="number" value={form.commissionRate} onChange={e=>handleChange('commissionRate', e.target.value)} className="input w-full" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Vehicle Types (comma separated)</label>
              <input value={form.vehicleTypes} onChange={e=>handleChange('vehicleTypes', e.target.value)} className="input w-full" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Features (comma separated)</label>
              <textarea value={form.features} onChange={e=>handleChange('features', e.target.value)} className="input w-full" rows={3} />
            </div>

            <div className="flex justify-end space-x-2">
              <button onClick={onClose} className="btn btn-secondary">Cancel</button>
              <button onClick={handleSubmit} className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : (initial ? 'Update' : 'Create')}</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
