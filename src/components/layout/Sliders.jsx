import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Upload, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Sliders() {
  const { token, hasPermission } = useAuth();
  const [sliders, setSliders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState(null);
  const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';

  const fetchSliders = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/sliders`);
      if (!res.ok) throw new Error('Failed to load sliders');
      const data = await res.json();
      setSliders(data);
    } catch (err) {
      toast.error(err.message || 'Failed to fetch sliders');
    } finally {
      setLoading(false);
    }
  }; 

  useEffect(() => {
    fetchSliders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return toast.error('Select an image to upload');
    try {
      setLoading(true);
      const fd = new FormData();
      fd.append('file', file);
      fd.append('active', 'true');

      const res = await fetch(`${API_BASE}/api/sliders/upload`, {
        method: 'POST',
        body: fd
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || 'Upload failed');
      // Refresh list instead of assuming order
      fetchSliders();
      setFile(null);
      toast.success('Slider added');
    } catch (err) {
      toast.error(err.message || 'Upload failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this slider?')) return;
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/sliders/${id}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || 'Delete failed');
      setSliders(prev => prev.filter(s => s._id !== id));
      toast.success('Deleted');
    } catch (err) {
      toast.error(err.message || 'Delete failed');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (s) => {
    try {
      const res = await fetch(`${API_BASE}/api/sliders/${s._id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ active: !s.active })
      });
      const updated = await res.json();
      if (!res.ok) throw new Error(updated.message || updated.error || 'Update failed');
      setSliders(prev => prev.map(sl => sl._id === updated._id ? updated : sl));
      toast.success('Updated');
    } catch (err) {
      toast.error(err.message || 'Update failed');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Manage Sliders</h1>
          <p className="text-sm text-gray-600">Add and manage carousel images</p>
        </div>
      </div>

      {/* Upload form */}
      {hasPermission('admin.create') && (
        <div className="card">
          <form onSubmit={handleUpload} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div>
              <label className="block text-sm font-medium text-gray-700">Image file</label>
              <div className="mt-1 flex items-center">
                <input type="file" accept="image/*" onChange={handleFileChange} />
              </div>
            </div>

            <div className="md:col-span-3 flex space-x-3">
              <button type="submit" className="btn btn-primary" disabled={loading}>
                <Upload className="h-4 w-4 mr-2" /> Upload & Add
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Sliders list */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left">
            <thead>
              <tr>
                <th className="p-2">Preview</th>
                <th className="p-2">Created</th>
                <th className="p-2">Active</th>
                <th className="p-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sliders.map((s) => (
                <tr key={s._id} className="border-t">
                  <td className="p-2"><img src={s.imageUrl} alt={`slider-${s._id}`} className="h-16 object-cover" /></td>
                  <td className="p-2">{new Date(s.createdAt).toLocaleString()}</td>
                  <td className="p-2">
                    {hasPermission('admin.edit') ? (
                      <button onClick={() => handleToggleActive(s)} className={`px-3 py-1 rounded ${s.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {s.active ? 'Active' : 'Inactive'}
                      </button>
                    ) : (
                      <span className={`${s.active ? 'text-green-700' : 'text-red-700'}`}>{s.active ? 'Active' : 'Inactive'}</span>
                    )}
                  </td>
                  <td className="p-2 flex items-center space-x-2">
                    {hasPermission('admin.delete') && (
                      <button onClick={() => handleDelete(s._id)} className="btn btn-danger">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
