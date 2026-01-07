import { useState, useEffect } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import { Modal } from '../ui/Modal';
import toast from 'react-hot-toast';

export default function InvestmentPlanModal({ isOpen, onClose, onSuccess, plan }) {
  const [formData, setFormData] = useState({
    name: '',
    minAmount: '',
    maxAmount: '',
    duration: '',
    expectedROI: '',
    riskLevel: 'low',
    features: [],
    active: true
  });

  const [newFeature, setNewFeature] = useState('');
  const [loading, setLoading] = useState(false);

  // Populate form when editing
  useEffect(() => {
    if (plan) {
      setFormData({
        name: plan.name || '',
        minAmount: plan.minAmount || '',
        maxAmount: plan.maxAmount || '',
        duration: plan.duration || '',
        expectedROI: plan.expectedROI || '',
        riskLevel: plan.riskLevel || 'low',
        features: plan.features || [],
        active: plan.active !== undefined ? plan.active : true
      });
    } else {
      setFormData({
        name: '',
        minAmount: '',
        maxAmount: '',
        duration: '',
        expectedROI: '',
        riskLevel: 'low',
        features: [],
        active: true
      });
    }
  }, [plan, isOpen]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleAddFeature = () => {
    if (newFeature.trim()) {
      setFormData(prev => ({
        ...prev,
        features: [...prev.features, newFeature.trim()]
      }));
      setNewFeature('');
    }
  };

  const handleRemoveFeature = (index) => {
    setFormData(prev => ({
      ...prev,
      features: prev.features.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!formData.name || !formData.minAmount || !formData.maxAmount || !formData.duration || !formData.expectedROI) {
      toast.error('Please fill in all required fields');
      return;
    }

    const minAmount = parseFloat(formData.minAmount);
    const maxAmount = parseFloat(formData.maxAmount);
    const duration = parseInt(formData.duration);
    const roi = parseFloat(formData.expectedROI);

    if (isNaN(minAmount) || minAmount <= 0) {
      toast.error('Please enter a valid minimum amount');
      return;
    }

    if (isNaN(maxAmount) || maxAmount <= 0) {
      toast.error('Please enter a valid maximum amount');
      return;
    }

    if (maxAmount <= minAmount) {
      toast.error('Maximum amount must be greater than minimum amount');
      return;
    }

    if (isNaN(duration) || duration <= 0) {
      toast.error('Please enter a valid duration');
      return;
    }

    if (isNaN(roi) || roi <= 0) {
      toast.error('Please enter a valid ROI percentage');
      return;
    }

    try {
      setLoading(true);
      
      const planData = {
        name: formData.name,
        minAmount: minAmount,
        maxAmount: maxAmount,
        duration: duration,
        expectedROI: roi,
        riskLevel: formData.riskLevel,
        features: formData.features,
        active: formData.active
      };

      // Pass data to parent which will handle the API call
      await onSuccess(planData);
      handleClose();
    } catch (error) {
      console.error('Error saving plan:', error);
      toast.error(plan ? 'Failed to update plan. Please try again.' : 'Failed to add plan. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      name: '',
      minAmount: '',
      maxAmount: '',
      duration: '',
      expectedROI: '',
      riskLevel: 'low',
      features: [],
      active: true
    });
    setNewFeature('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={plan ? "Edit Investment Plan" : "Add New Investment Plan"}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Plan Name */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Plan Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="input w-full"
              placeholder="e.g., Premium Fleet Package"
              required
            />
          </div>

          {/* Min Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Minimum Amount (₹) <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="minAmount"
              value={formData.minAmount}
              onChange={handleChange}
              className="input w-full"
              
             
              required
            />
          </div>

          {/* Max Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Maximum Amount (₹) <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="maxAmount"
              value={formData.maxAmount}
              onChange={handleChange}
              className="input w-full"
             
              
              required
            />
          </div>

          {/* Duration */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Duration (months) <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="duration"
              value={formData.duration}
              onChange={handleChange}
              className="input w-full"
              placeholder="12"
              min="1"
              required
            />
          </div>

          {/* Expected ROI */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Expected ROI (%) <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="expectedROI"
              value={formData.expectedROI}
              onChange={handleChange}
              className="input w-full"
              placeholder="8.5"
              min="0"
              step="0.1"
              required
            />
          </div>

          {/* Risk Level */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Risk Level <span className="text-red-500">*</span>
            </label>
            <select
              name="riskLevel"
              value={formData.riskLevel}
              onChange={handleChange}
              className="input w-full"
              required
            >
              <option value="low">Low Risk</option>
              <option value="medium">Medium Risk</option>
              <option value="high">High Risk</option>
            </select>
          </div>

          {/* Active Status */}
          <div className="flex items-center">
            <input
              type="checkbox"
              name="active"
              checked={formData.active}
              onChange={handleChange}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label className="ml-2 block text-sm text-gray-900">
              Active Plan
            </label>
          </div>
        </div>

        {/* Features */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Features
          </label>
          <div className="space-y-2">
            {/* Feature List */}
            {formData.features.map((feature, index) => (
              <div key={index} className="flex items-center space-x-2">
                <span className="flex-1 text-sm bg-gray-50 px-3 py-2 rounded border">{feature}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveFeature(index)}
                  className="text-red-600 hover:text-red-800"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}

            {/* Add Feature Input */}
            <div className="flex space-x-2">
              <input
                type="text"
                value={newFeature}
                onChange={(e) => setNewFeature(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddFeature();
                  }
                }}
                className="input flex-1"
                placeholder="Add a feature"
              />
              <button
                type="button"
                onClick={handleAddFeature}
                className="btn btn-outline flex items-center"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add
              </button>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3 mt-6 pt-4 border-t">
          <button
            type="button"
            onClick={handleClose}
            className="btn btn-outline"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
          >
            {loading ? (plan ? 'Updating...' : 'Adding...') : (plan ? 'Update Plan' : 'Add Plan')}
          </button>
        </div>
      </form>
    </Modal>
  );
}
