
import React, { useState } from 'react';

const AddManagerModal = ({ isOpen, onClose, onAddManager, initialData }) => {
  const [form, setForm] = useState({
    username: '',
    password: '',
    name: '',
    email: '',
    mobile: '',
    address: '',
    city: '',
    pincode: '',
    salary: '',
    department: 'Manager',
    serviceCategory: '',
    dob: '',
  });

  // Prefill form when initialData changes (for edit)
  React.useEffect(() => {
    if (initialData && isOpen) {
      setForm({
        username: initialData.username || '',
        password: initialData.password || '',
        name: initialData.name || '',
        email: initialData.email || '',
        mobile: initialData.mobile || '',
        address: initialData.address || '',
        city: initialData.city || '',
        pincode: initialData.pincode || '',
        salary: initialData.salary || '',
      department: initialData.department || 'Manager',
     
        dob: initialData.dob ? initialData.dob.slice(0, 10) : '',
      });
    } else if (isOpen) {
      setForm({
        username: '',
        password: '',
        name: '',
        email: '',
        mobile: '',
        address: '',
        city: '',
        pincode: '',
        salary: '',
        department: 'Manager',
        
        dob: '',
      });
    }
  }, [initialData, isOpen]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await onAddManager(form);
      setForm({
        username: '',
        password: '',
        name: '',
        email: '',
        mobile: '',
        address: '',
        city: '',
        pincode: '',
        salary: '',
      
        department: 'Driver Manager',
        
        dob: '',
      });
    } catch (err) {
      setError(err.message || 'Failed to add manager');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
      <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-2xl relative">
        <button
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
          onClick={onClose}
        >
          &times;
        </button>
        <h2 className="text-xl font-semibold mb-2">Add New Driver Manager </h2>
        {error && <div className="text-red-500 mb-2">{error}</div>}
        <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
          <input name="username" value={form.username} onChange={handleChange} placeholder="Username" className="border p-2 rounded" required />
          <input name="password" value={form.password} onChange={handleChange} placeholder="Password" type="text" className="border p-2 rounded" required />
          <input name="name" value={form.name} onChange={handleChange} placeholder="Name" className="border p-2 rounded" required />
          <input name="email" value={form.email} onChange={handleChange} placeholder="E-Mail" type="email" className="border p-2 rounded" required />
          <input name="mobile" value={form.mobile} onChange={handleChange} placeholder="Mobile" className="border p-2 rounded" required />
          <input name="address" value={form.address} onChange={handleChange} placeholder="Address" className="border p-2 rounded" />
          <input name="city" value={form.city} onChange={handleChange} placeholder="City" className="border p-2 rounded" />
          <input name="pincode" value={form.pincode} onChange={handleChange} placeholder="Pincode" className="border p-2 rounded" />
          <input name="salary" value={form.salary} onChange={handleChange} placeholder="Salary per month" className="border p-2 rounded" />
         
          <select
  name="department"
  value={form.department}
  onChange={handleChange}
  className="border p-2 rounded"
  required
>
  <option value="">Select Department</option>
  <option value="Manager">Driver Manager</option>
  <option value="HR">HR</option>
  <option value="Onboard Team">Onboard Team</option>
</select>
          <input name="dob" value={form.dob} onChange={handleChange} placeholder="mm/dd/yyyy" type="date" className="border p-2 rounded" />
          <div className="col-span-2 flex justify-center mt-4">
            <button type="submit" className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700" disabled={submitting}>
              {submitting ? 'Adding...' : 'Add Manager'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddManagerModal;
