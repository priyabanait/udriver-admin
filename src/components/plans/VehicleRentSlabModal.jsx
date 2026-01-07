import { useState, useEffect, useRef } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import { Modal } from '../ui/Modal';

// Accept photo and onEditPhoto as props
export default function VehicleRentSlabModal({ isOpen, onClose, vehicleName, vehicleData, onSave, embedded = false, photo: initialPhoto, onEditPhoto }) {
  const [formData, setFormData] = useState({
    securityDeposit: 0,
    rows: []
  });
  // For image upload/edit
  const [photo, setPhoto] = useState(initialPhoto || null); // base64 or url
  const [photoPreview, setPhotoPreview] = useState(initialPhoto || null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (vehicleData) {
      setFormData({
        securityDeposit: vehicleData.securityDeposit || 0,
        rows: vehicleData.rows ? [...vehicleData.rows] : []
      });
    }
  }, [vehicleData]);

  // Update photo if prop changes (e.g., when switching plans)
  useEffect(() => {
    setPhoto(initialPhoto || null);
    setPhotoPreview(initialPhoto || null);
  }, [initialPhoto, isOpen]);

  const handleSecurityDepositChange = (e) => {
    const newData = {
      ...formData,
      securityDeposit: parseFloat(e.target.value) || " "
    };
    setFormData(newData);
    if (embedded) onSave(newData);
  };

  const handleRowChange = (index, field, value) => {
    const newRows = [...formData.rows];
    newRows[index] = {
      ...newRows[index],
      [field]: field === 'trips' ? value : (parseFloat(value) || 0)
    };
    const newData = { ...formData, rows: newRows };
    setFormData(newData);
    if (embedded) onSave(newData);
  };

  const addRow = () => {
    const newData = {
      ...formData,
      rows: [...formData.rows, { trips: '', rentDay: 0, weeklyRent: 0, accidentalCover: 105, acceptanceRate: 60 }]
    };
    setFormData(newData);
    if (embedded) onSave(newData);
  };

  const removeRow = (index) => {
    const newData = {
      ...formData,
      rows: formData.rows.filter((_, i) => i !== index)
    };
    setFormData(newData);
    if (embedded) onSave(newData);
  };

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

  const handleEditPhoto = () => {
    if (fileInputRef.current) fileInputRef.current.click();
  };

  const handleRemovePhoto = () => {
    setPhoto(null);
    setPhotoPreview(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Pass photo as part of formData
    onSave({ ...formData, photo });
  };

  // Embedded mode - render only form fields without Modal wrapper
  if (embedded) {
    return (
      <div className="space-y-6">
        {/* Image is shown at the parent Plan level to avoid duplication. Provide an Edit button that delegates to the parent if available. */}
        {/* <div className="mb-4">
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={onEditPhoto || handleEditPhoto}
          >
            Edit Image
          </button>
        </div> */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Security Deposit (₹)
          </label>
          <input
            type="text"
            value={formData.securityDeposit}
            onChange={handleSecurityDepositChange}
            className="input w-full"
            required
           
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="block text-sm font-medium text-gray-700">
              Rent Slabs
            </label>
            <button
              type="button"
              onClick={addRow}
              className="btn btn-outline btn-sm flex items-center"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Row
            </button>
          </div>

          <div className="space-y-3">
            {formData.rows.map((row, index) => (
              <div key={index} className="flex items-start gap-2 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex-1 grid grid-cols-5 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1"> Trips</label>
                    <input
                      type="text"
                      value={row.trips}
                      onChange={(e) => handleRowChange(index, 'trips', e.target.value)}
                      className="input w-full text-sm"
                      placeholder="60 or 0-59"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Rent/Day (₹)</label>
                    <input
                      type="text"
                      value={row.rentDay}
                      onChange={(e) => handleRowChange(index, 'rentDay', e.target.value)}
                      className="input w-full text-sm"
                      required
                      min="0"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Weekly Rent (₹)</label>
                    <input
                      type="text"
                      value={row.weeklyRent}
                      onChange={(e) => handleRowChange(index, 'weeklyRent', e.target.value)}
                      className="input w-full text-sm"
                      required
                      min="0"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Accidental Cover (₹)</label>
                    <input
                      type="text"
                      value={row.accidentalCover || 105}
                      onChange={(e) => handleRowChange(index, 'accidentalCover', e.target.value)}
                      className="input w-full text-sm"
                      required
                      min="0"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Acceptance Rate (%)</label>
                    <input
                      type="text"
                      value={row.acceptanceRate || 60}
                      onChange={(e) => handleRowChange(index, 'acceptanceRate', e.target.value)}
                      className="input w-full text-sm"
                      required
                      min="0"
                      max="100"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => removeRow(index)}
                  className="text-red-600 hover:text-red-800 p-2 mt-6"
                  title="Remove row"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
            {formData.rows.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
                No rent slabs added. Click "Add Row" to create one.
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Edit ${vehicleName} Rent Plan`} className="max-w-5xl">
      <form onSubmit={handleSubmit} className="flex flex-col max-h-[80vh]">
        <div className="flex-1  px-6 py-4 space-y-6">
          {/* Show plan image and upload/edit controls */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Photo (optional)</label>
            <div className="flex items-center gap-4 mb-2">
              {photoPreview ? (
                <img
                  src={photoPreview}
                  alt="Plan"
                  className="h-24 w-24 object-cover rounded shadow border cursor-pointer"
                  title="Click to change image"
                  onClick={handleEditPhoto}
                />
              ) : (
                <div
                  className="h-24 w-24 flex items-center justify-center bg-gray-100 text-gray-400 border rounded cursor-pointer"
                  style={{ fontSize: '0.9rem' }}
                  onClick={handleEditPhoto}
                  title="Click to upload image"
                >
                  No Image<br />Click to Upload
                </div>
              )}
              {photoPreview && (
                <button
                  type="button"
                  className="btn btn-danger btn-xs ml-2"
                  onClick={handleRemovePhoto}
                >
                  Remove
                </button>
              )}
              <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                onChange={handlePhotoChange}
                style={{ display: 'none' }}
              />
            </div>
          </div>
          {/* Security Deposit */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Security Deposit (₹)
            </label>
            <input
              type="text"
              value={formData.securityDeposit}
              onChange={handleSecurityDepositChange}
              className="input w-full"
              required
             
            />
          </div>

          {/* Rent Rows */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-gray-700">
                Rent Slabs
              </label>
              <button
                type="button"
                onClick={addRow}
                className="btn btn-outline btn-sm flex items-center"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Row
              </button>
            </div>

            <div className="space-y-3">
              {formData.rows.map((row, index) => (
                <div key={index} className="flex items-start gap-2 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex-1 grid grid-cols-5 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Weekly Trips</label>
                      <input
                        type="text"
                        value={row.trips}
                        onChange={(e) => handleRowChange(index, 'trips', e.target.value)}
                        className="input w-full text-sm"
                        placeholder="60 or 0-59"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Rent/Day (₹)</label>
                      <input
                        type="text"
                        value={row.rentDay}
                        onChange={(e) => handleRowChange(index, 'rentDay', e.target.value)}
                        className="input w-full text-sm"
                        required
                        min="0"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Weekly Rent (₹)</label>
                      <input
                        type="text"
                        value={row.weeklyRent}
                        onChange={(e) => handleRowChange(index, 'weeklyRent', e.target.value)}
                        className="input w-full text-sm"
                        required
                        min="0"
                      />
                    </div>
                    {/* <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Accidental Cover (₹)</label>
                      <input
                        type="text"
                        value={row.accidentalCover || 105}
                        onChange={(e) => handleRowChange(index, 'accidentalCover', e.target.value)}
                        className="input w-full text-sm"
                        required
                        min="0"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Acceptance Rate (%)</label>
                      <input
                        type="text"
                        value={row.acceptanceRate || 60}
                        onChange={(e) => handleRowChange(index, 'acceptanceRate', e.target.value)}
                        className="input w-full text-sm"
                        required
                        min="0"
                        max="100"
                      />
                    </div> */}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeRow(index)}
                    className="text-red-600 hover:text-red-800 p-2 mt-6"
                    title="Remove row"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
              {formData.rows.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
                  No rent slabs added. Click "Add Row" to create one.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Actions - Fixed at bottom */}
        {!embedded && (
          <div className="flex justify-end gap-3 pt-4 px-6 pb-4 border-t border-gray-200 bg-gray-50">
            <button 
              type="button" 
              onClick={onClose} 
              className="px-5 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all duration-200"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="px-5 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all duration-200 shadow-sm hover:shadow-md"
            >
              Save Changes
            </button>
          </div>
        )}
      </form>
    </Modal>
  );
}
