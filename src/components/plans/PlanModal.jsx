import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import toast from 'react-hot-toast';

import VehicleRentSlabModal from './VehicleRentSlabModal';

export default function PlanModal({ isOpen, onClose, initial = null, onSave, apiPath, slabType = null }) {
  const [form, setForm] = useState({
    name: ''
  });

  const [saving, setSaving] = useState(false);
  const [slabData, setSlabData] = useState({ securityDeposit: 0, rows: [] });

  useEffect(() => {
    if (initial) {
      setForm({
        name: initial.name || ''
      });
      setSlabData({
        securityDeposit: initial.securityDeposit || 0,
        rows: (slabType === 'weekly' ? initial.weeklyRentSlabs : initial.dailyRentSlabs) || []
      });
    } else {
      setForm({ name: '' });
      setSlabData({ securityDeposit: 0, rows: [] });
    }
  }, [initial, isOpen, slabType]);

  if (!isOpen) return null;

  const handleChange = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const handleSubmit = async () => {
    if (!form.name.trim()) return toast.error('Car name is required');
    if (!slabData.rows.length) return toast.error('Add at least one rent slab');
    try {
      setSaving(true);
      const API_BASE = import.meta.env.VITE_API_BASE || 'https://udrive-backend-1igb.vercel.app';
      const token = localStorage.getItem('udriver_token') || 'mock';
      let payload = {
        name: form.name,
        category: 'standard',
        status: 'active',
        createdDate: new Date().toISOString(),
        weeklyRentSlabs: slabType === 'weekly' ? slabData.rows : [],
        dailyRentSlabs: slabType === 'daily' ? slabData.rows : [],
        securityDeposit: slabData.securityDeposit
      };
      
      console.log('Submitting plan:', payload);
      
      let res;
      const basePath = apiPath.startsWith('/') ? apiPath : `/${apiPath}`;
      if (initial && (initial._id || initial.id)) {
        const id = initial._id || initial.id;
        res = await fetch(`${API_BASE}${basePath}/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(payload)
        });
      } else {
        console.log('Creating new plan at:', `${API_BASE}${basePath}`);
        res = await fetch(`${API_BASE}${basePath}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(payload)
        });
      }
      
      console.log('Response status:', res.status);
      
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        console.error('Error response:', body);
        throw new Error(body?.message || `Failed to save: ${res.status}`);
      }
      const saved = await res.json();
      console.log('Saved plan:', saved);
      onSave && onSave(saved);
      toast.success(initial ? 'Plan updated' : 'Plan created');
      onClose();
    } catch (err) {
      console.error('Submit error:', err);
      toast.error(err.message || 'Failed to save plan');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={onClose} />
        <div className="relative bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between p-4 border-b">
            <h3 className="text-lg font-medium">{initial ? 'Edit Plan' : `Create ${slabType === 'weekly' ? 'Weekly' : 'Daily'} Rent Plan`}</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5"/></button>
          </div>
          <div className="p-6 space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Car Name</label>
              <input 
                value={form.name} 
                onChange={e=>setForm(prev => ({ ...prev, name: e.target.value }))} 
                className="input w-full"
                placeholder="e.g., Wagon R, Swift, etc."
                required
              />
            </div>

            <div className="border-t pt-6">
              <h4 className="text-sm font-medium text-gray-700 mb-4">
                {slabType === 'weekly' ? 'Weekly' : 'Daily'} Rent Slabs
              </h4>
              <VehicleRentSlabModal
                onClose={() => {}}
                vehicleName={form.name || (slabType === 'weekly' ? 'Weekly Plan' : 'Daily Plan')}
                vehicleData={slabData}
                onSave={data => setSlabData(data)}
                embedded={true}
              />
            </div>
            
            <div className="flex justify-end space-x-2 mt-6 pt-4 border-t">
              <button type="button" onClick={onClose} className="btn btn-secondary">Cancel</button>
              <button type="button" onClick={handleSubmit} className="btn btn-primary" disabled={saving}>
                {saving ? 'Saving...' : (initial ? 'Update' : 'Create')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
