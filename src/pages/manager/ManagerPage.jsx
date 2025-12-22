
import React, { useState, useEffect } from 'react';
import AddManagerModal from '../../components/admin/AddManagerModal';
import { FiTrash2, FiEdit2, FiEye } from 'react-icons/fi';

const ManagerPage = () => {

  const [modalOpen, setModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [managers, setManagers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedManager, setSelectedManager] = useState(null);

  // Fetch managers from backend
  useEffect(() => {
    const fetchManagers = async () => {
      setLoading(true);
      try {
        const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';
        const res = await fetch(`${API_BASE}/api/managers?limit=1000`);
        const result = await res.json();
        const data = result.data || result;
        setManagers(Array.isArray(data) ? data : []);
      } catch (err) {
        setError('Failed to fetch managers');
      } finally {
        setLoading(false);
      }
    };
    fetchManagers();
  }, []);

  const handleAddManager = async (managerData) => {
    setLoading(true);
    setError(null);
    try {
      const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';
      const res = await fetch(`${API_BASE}/api/managers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(managerData),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add manager');
      setManagers((prev) => [...prev, data.manager]);
      setModalOpen(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteManager = async (id) => {
    if (!window.confirm('Are you sure you want to delete this manager?')) return;
    setLoading(true);
    setError(null);
    try {
      const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';
      const res = await fetch(`${API_BASE}/api/managers/${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete manager');
      setManagers((prev) => prev.filter((mgr) => mgr._id !== id));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEditManager = (manager) => {
    setSelectedManager(manager);
    setEditModalOpen(true);
  };

  const handleViewManager = (manager) => {
    setSelectedManager(manager);
    setViewModalOpen(true);
  };

  const handleUpdateManager = async (managerData) => {
    setLoading(true);
    setError(null);
    try {
      const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';
      const res = await fetch(`${API_BASE}/api/managers/${selectedManager._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(managerData),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update manager');
      setManagers((prev) => prev.map((mgr) => mgr._id === selectedManager._id ? data : mgr));
      setEditModalOpen(false);
      setSelectedManager(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Manage Managers</h1>
        <button
          className="bg-primary-600 text-white px-4 py-2 rounded hover:bg-primary-700"
          onClick={() => setModalOpen(true)}
        >
          Add Manager
        </button>
      </div>
      <AddManagerModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onAddManager={handleAddManager}
      />
      <div className="bg-white rounded shadow p-4">
        <h2 className="text-lg font-semibold mb-4">Managers List</h2>
        {loading && <p className="text-gray-500">Loading...</p>}
        {error && <p className="text-red-500">{error}</p>}
        {!loading && !error && managers.length === 0 && (
          <p className="text-gray-500">No managers added yet.</p>
        )}
        {!loading && !error && managers.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-full table-auto">
            <thead>
              <tr>
                <th className="px-4 py-2 whitespace-nowrap">Name</th>
                <th className="px-4 py-2 whitespace-nowrap">Username</th>
                <th className="px-4 py-2 whitespace-nowrap">Password</th>
                <th className="px-4 py-2 whitespace-nowrap">Email</th>
                <th className="px-4 py-2 whitespace-nowrap">Mobile</th>
                <th className="px-4 py-2 whitespace-nowrap">Department</th>
                <th className="px-4 py-2 whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody>
              {managers.map((mgr, idx) => (
                <tr key={mgr._id || idx}>
                  <td className="border px-4 py-2 whitespace-nowrap">{mgr.name}</td>
                  <td className="border px-4 py-2 whitespace-nowrap">{mgr.username}</td>
                  <td className="border px-4 py-2 whitespace-nowrap">{mgr.password}</td>
                  <td className="border px-4 py-2 whitespace-nowrap">{mgr.email}</td>
                  <td className="border px-4 py-2 whitespace-nowrap">{mgr.mobile}</td>
                  <td className="border px-4 py-2 whitespace-nowrap">{mgr.department}</td>
                  <td className="border px-4 py-2 flex gap-2 whitespace-nowrap">
                    <button title="View" onClick={() => handleViewManager(mgr)} className="text-blue-600 hover:text-blue-800">
                      <FiEye />
                    </button>
                    <button title="Edit" onClick={() => handleEditManager(mgr)} className="text-yellow-600 hover:text-yellow-800">
                      <FiEdit2 />
                    </button>
                    <button title="Delete" onClick={() => handleDeleteManager(mgr._id)} className="text-red-600 hover:text-red-800">
                      <FiTrash2 />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            </table>
          </div>
        )}
      </div>
      {/* Edit Manager Modal */}
      {editModalOpen && (
        <AddManagerModal
          isOpen={editModalOpen}
          onClose={() => { setEditModalOpen(false); setSelectedManager(null); }}
          onAddManager={handleUpdateManager}
          initialData={selectedManager}
        />
      )}
      {/* View Manager Modal */}
      {viewModalOpen && selectedManager && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
          <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-lg relative">
            <button
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
              onClick={() => { setViewModalOpen(false); setSelectedManager(null); }}
            >
              &times;
            </button>
            <h2 className="text-xl font-semibold mb-4">Manager Details</h2>
            <div className="space-y-2">
              <div><strong>Name:</strong> {selectedManager.name}</div>
              <div><strong>Email:</strong> {selectedManager.email}</div>
              <div><strong>Mobile:</strong> {selectedManager.mobile}</div>
              <div><strong>Department:</strong> {selectedManager.department}</div>
              <div><strong>Username:</strong> {selectedManager.username}</div>
              <div><strong>Address:</strong> {selectedManager.address}</div>
              <div><strong>City:</strong> {selectedManager.city}</div>
              <div><strong>Pincode:</strong> {selectedManager.pincode}</div>
              <div><strong>Salary:</strong> {selectedManager.salary}</div>
              <div><strong>Status:</strong> {selectedManager.status}</div>
              <div><strong>Service Category:</strong> {selectedManager.serviceCategory}</div>
              <div><strong>Date of Birth:</strong> {selectedManager.dob ? new Date(selectedManager.dob).toLocaleDateString() : ''}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManagerPage;
