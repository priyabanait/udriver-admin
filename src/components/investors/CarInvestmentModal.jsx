import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';

const API_BASE = import.meta.env.VITE_API_BASE || 'https://udrive-backend-1igb.vercel.app';

export default function CarInvestmentModal({ isOpen, onClose, onSuccess, carInvestment }) {
  const [form, setForm] = useState({
    carname: '',
    carOwnerName: '',
    investorId: '',
    investorMobile: '',
    carvalue: '',
    MonthlyPayout: '',
    deductionTDS: '',
    features: [],
    active: true
  });
  const [featureInput, setFeatureInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [investors, setInvestors] = useState([]);

  useEffect(() => {
    // Load investors for dropdown
    const loadInvestors = async () => {
      try {
        const response = await fetch(`${API_BASE}/api/investors`);
        if (response.ok) {
          const data = await response.json();
          setInvestors(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        console.error('Failed to load investors:', err);
      }
    };
    loadInvestors();
  }, []);

  useEffect(() => {
    if (carInvestment) {
      setForm({
        carname: carInvestment.carname || '',
        carOwnerName: carInvestment.carOwnerName || '',
        investorId: carInvestment.investorId || '',
        investorMobile: carInvestment.investorMobile || '',
        carvalue: carInvestment.carvalue || 0,
        MonthlyPayout: carInvestment.MonthlyPayout || 0,
        deductionTDS: carInvestment.deductionTDS || 0,
        features: carInvestment.features || [],
        active: carInvestment.active !== undefined ? carInvestment.active : true
      });
    } else {
      setForm({
        carname: '',
        carOwnerName: '',
        investorId: '',
        investorMobile: '',
        carvalue: '',
        MonthlyPayout: '',
        deductionTDS: '',
        features: [],
        active: true
      });
    }
  }, [carInvestment, isOpen]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    // Convert string values to numbers for submission
    const submitData = {
      ...form,
      carvalue: Number(form.carvalue) || 0,
      MonthlyPayout: Number(form.MonthlyPayout) || 0,
      deductionTDS: Number(form.deductionTDS) || 0
    };
    
    console.log('Submitting car investment:', submitData);
    
    try {
      const method = carInvestment ? 'PUT' : 'POST';
      const url = carInvestment
        ? `${API_BASE}/api/car-investment-entries/${carInvestment._id}`
        : `${API_BASE}/api/car-investment-entries`;
      
      console.log('Request:', { method, url, body: submitData });
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitData),
      });
      
      if (!res.ok) {
        const errorData = await res.text();
        console.error('Server response:', errorData);
        throw new Error(errorData || 'Failed to save car investment');
      }
      
      const data = await res.json();
      console.log('Success response:', data);
      toast.success('Car investment saved successfully!');
      onSuccess && onSuccess(data);
      onClose();
    } catch (err) {
      console.error('Error saving car investment:', err);
      toast.error(err.message || 'Error saving car investment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-2xl">
        <h2 className="text-2xl font-bold mb-4">{carInvestment ? 'Edit Car Investment' : 'Add New Car Investment'}</h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Car Name *</label>
              <input name="carname" value={form.carname} onChange={handleChange} required placeholder="e.g., Wagon R" className="input w-full" />
           
             
            </div>
           
            {/* <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Investor Mobile</label>
              <input name="investorMobile" value={form.investorMobile} onChange={handleChange} placeholder="Mobile Number" className="input w-full" />
            </div> */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Car Value (₹) *</label>
              <input name="carvalue" value={form.carvalue} onChange={handleChange} required type="number" placeholder="e.g., 500000" className="input w-full" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Monthly Payout (₹) *</label>
              <input name="MonthlyPayout" value={form.MonthlyPayout} onChange={handleChange} required type="number" placeholder="Monthly Payout" className="input w-full" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Deduction TDS (%) *</label>
              <input name="deductionTDS" value={form.deductionTDS} onChange={handleChange} required type="number" step="0.01" placeholder="TDS Percentage" className="input w-full" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Final Monthly Payout (₹)</label>
              <div className="input w-full bg-gray-100 flex items-center text-gray-700 font-medium">
                {form.MonthlyPayout && form.deductionTDS !== '' 
                  ? `₹${(Number(form.MonthlyPayout) - (Number(form.MonthlyPayout) * Number(form.deductionTDS) / 100)).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                  : '₹0.00'
                }
              </div>
              <p className="text-xs text-gray-500 mt-1">Auto-calculated: Monthly Payout - TDS</p>
            </div>
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Features</label>
            <div className="flex space-x-2 mb-2">
              <input
                type="text"
                value={featureInput}
                onChange={e => setFeatureInput(e.target.value)}
                placeholder="Add a feature"
                className="input w-full"
              />
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  if (featureInput.trim()) {
                    setForm({ ...form, features: [...form.features, featureInput.trim()] });
                    setFeatureInput('');
                  }
                }}
              >+ Add</button>
            </div>
            <ul className="space-y-2">
              {form.features.map((feature, idx) => (
                <li key={idx} className="flex items-center justify-between bg-gray-100 rounded px-3 py-2">
                  <span>{feature}</span>
                  <button type="button" className="text-red-500 ml-2" onClick={() => {
                    setForm({ ...form, features: form.features.filter((_, i) => i !== idx) });
                  }}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </li>
              ))}
            </ul>
          </div>
          <div className="flex items-center space-x-4 mb-4">
            <label className="text-sm">Active Plan</label>
            <input
              type="checkbox"
              name="active"
              checked={form.active}
              onChange={e => setForm({ ...form, active: e.target.checked })}
            />
          </div>
          <div className="flex justify-end space-x-2 mt-6">
            <button type="button" onClick={onClose} className="btn btn-secondary">Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? (carInvestment ? 'Updating...' : 'Saving...') : carInvestment ? 'Update Car Investment' : 'Add Car Investment'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
