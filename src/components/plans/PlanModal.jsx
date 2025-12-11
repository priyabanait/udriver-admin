import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import toast from 'react-hot-toast';

import VehicleRentSlabModal from './VehicleRentSlabModal';


export default function PlanModal({ isOpen, onClose, initial = null, onSave, apiPath, slabType = null }) {
  const [form, setForm] = useState({ name: '' });
  const [saving, setSaving] = useState(false);
  const [slabData, setSlabData] = useState({ securityDeposit: 0, rows: [] });
  const [photo, setPhoto] = useState(null); // base64 string
  const [photoPreview, setPhotoPreview] = useState(null);

  useEffect(() => {
    if (initial) {
      setForm({ name: initial.name || '' });
      setSlabData({
        securityDeposit: initial.securityDeposit || 0,
        rows: (slabType === 'weekly' ? initial.weeklyRentSlabs : initial.dailyRentSlabs) || []
      });
      setPhoto(null);
      setPhotoPreview(initial.photo || null);
    } else {
      setForm({ name: '' });
      setSlabData({ securityDeposit: 0, rows: [] });
      setPhoto(null);
      setPhotoPreview(null);
    }
  }, [initial, isOpen, slabType]);

  if (!isOpen) return null;

  const handleChange = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setPhoto(ev.target.result);
      setPhotoPreview(ev.target.result);
    };
    reader.readAsDataURL(file);
  };

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
      // Add photo for both daily and weekly plans if present
      if ((slabType === 'daily' || slabType === 'weekly') && photo) {
        payload.photo = photo;
      }
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

            {/* Always show the image area at the top, with placeholder if no image */}
            {(slabType === 'daily' || slabType === 'weekly') && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Photo (optional)</label>
                <div className="flex items-center gap-4 mb-2">
                  {(photoPreview || (initial && initial.photo)) ? (
                    <img
                      src={photoPreview || initial.photo}
                      alt="Plan"
                      className="h-24 w-24 object-cover rounded shadow border cursor-pointer"
                      title="Click to change image"
                      onClick={() => document.querySelector('input[type="file"][accept="image/*"]')?.click()}
                    />
                  ) : (
                    <div
                      className="h-24 w-24 flex items-center justify-center bg-gray-100 text-gray-400 border rounded cursor-pointer"
                      style={{ fontSize: '0.9rem' }}
                      onClick={() => document.querySelector('input[type="file"][accept="image/*"]')?.click()}
                      title="Click to upload image"
                    >
                      No Image<br/>Click to Upload
                    </div>
                  )}
                  {(photoPreview || (initial && initial.photo)) && (
                    <button
                      type="button"
                      className="btn btn-danger btn-xs ml-2"
                      onClick={() => { setPhoto(null); setPhotoPreview(null); }}
                    >
                      Remove
                    </button>
                  )}
                </div>
                <input type="file" accept="image/*" onChange={handlePhotoChange} className="input w-full" style={{display: 'block'}} />
              </div>
            )}

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
                photo={photoPreview || (initial && initial.photo) || null}
                onEditPhoto={() => {
                  // Focus the file input for photo upload
                  document.querySelector('input[type="file"][accept="image/*"]')?.click();
                }}
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
