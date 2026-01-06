import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import toast from 'react-hot-toast';

export default function VehicleModal({ isOpen, onClose, vehicle = null, onSave }) {
  // Dynamic options from backend; keep COLORS static
  const COLORS = [
    'White', 'Black', 'Silver', 'Grey', 'Red', 'Blue', 'Green', 'Yellow', 'Orange', 'Brown', 'Other'
  ];

  const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';

  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [models, setModels] = useState([]);
  const [carNames, setCarNames] = useState([]);
  const [investors, setInvestors] = useState([]);
const [investorSearch, setInvestorSearch] = useState('');
const [showInvestorDropdown, setShowInvestorDropdown] = useState(false);
  const [form, setForm] = useState({
    registrationNumber: '',
    model: '',
    carName: '',
    brand: '',
  category: '',
    investorId: '',
    ownerName: '',
    ownerPhone: '',
    kycStatus: '',
    manufactureYear: '',
    registrationDate: '',
  rcExpiryDate: '',
    roadTaxDate: '',
    roadTaxNumber: '',
    insuranceDate: '',
    permitDate: '',
    emissionDate: '',
    trafficFine: '',
    trafficFineDate: '',
    fuelType: '',
    color: '',
    assignedDriver: '',
    status: 'inactive',
    remarks: '',
    driverAgreementType: '',
    // Document & Photo uploads (File objects)
    registrationCardPhoto: null,
    roadTaxPhoto: null,
    pucNumber: '',
    pucPhoto: null,
    permitPhoto: null,
    carFrontPhoto: null,
    carLeftPhoto: null,
    carRightPhoto: null,
    carBackPhoto: null,
    carFullPhoto: null,
    // New fields
    insurancePhoto: null,
    interiorPhoto: null,
    speedometerPhoto: null
    ,fcPhoto: null
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [drivers, setDrivers] = useState([]);
  const [managers, setManagers] = useState([]);
  const [previews, setPreviews] = useState({});
  const [driverSearch, setDriverSearch] = useState('');
  const [managerSearch, setManagerSearch] = useState('');
  const [showDriverDropdown, setShowDriverDropdown] = useState(false);
  const [showManagerDropdown, setShowManagerDropdown] = useState(false);

  const loadOptions = async (type, setter) => {
    try {
      const res = await fetch(`${API_BASE}/api/vehicle-options?type=${encodeURIComponent(type)}`);
      const data = res.ok ? await res.json() : [];
      const values = Array.isArray(data) ? data.map(o => o.value) : [];
      setter(values);
    } catch (e) {
      console.error('loadOptions error', e);
      setter([]);
    }
  };

  useEffect(() => {
    // load dropdown options when opening
    if (isOpen) {
      loadOptions('category', setCategories);
      loadOptions('brand', setBrands);
      loadOptions('model', setModels);
      loadOptions('carName', setCarNames);
      fetchDrivers();
      fetchManagers();
      fetchInvestors();
    }
  }, [isOpen]);

  useEffect(() => {
    // clear previews when switching vehicle or reopening
    setPreviews({});
  }, [vehicle, isOpen]);

  useEffect(() => {
    return () => {
      Object.values(previews).forEach((url) => {
        if (url) URL.revokeObjectURL(url);
      });
    };
  }, [previews]);
  const fetchManagers = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/managers?limit=1000`);
      const result = res.ok ? await res.json() : [];
      const data = result.data || result;
      setManagers(Array.isArray(data) ? data : []);
    } catch (e) {
      setManagers([]);
    }
  };

  const fetchInvestors = async () => {
    try {
      // Request a larger limit for dropdowns and support paginated or raw array responses
      const res = await fetch(`${API_BASE}/api/investors?limit=1000`);
      const result = res.ok ? await res.json() : [];
      const data = result.data || result;
      setInvestors(Array.isArray(data) ? data : []);
    } catch (e) {
      setInvestors([]);
    }
  };

  const fetchDrivers = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/drivers?limit=1000`);
      const result = res.ok ? await res.json() : [];
      const data = result.data || result;
      setDrivers(Array.isArray(data) ? data : []);
    } catch (e) {
      setDrivers([]);
    }
  };

  useEffect(() => {
    if (vehicle) {
      setForm({
        registrationNumber: vehicle.registrationNumber || '',
        model: vehicle.model || '',
        carName: vehicle.carName || vehicle.name || '',
  brand: vehicle.brand || '',
  category: vehicle.category || '',
        investorId: vehicle.investorId?._id || vehicle.investorId || '',
        ownerName: vehicle.ownerName || vehicle.owner || '',
        ownerPhone: vehicle.ownerPhone || '',
        kycStatus: vehicle.kycStatus || vehicle.kyc || vehicle.kyc_status || '',
        manufactureYear: vehicle.year || vehicle.manufactureYear || '',
        registrationDate: vehicle.registrationDate || vehicle.purchaseDate || '',
        rcExpiryDate: vehicle.rcExpiryDate || vehicle.rcExpiry || '',
        roadTaxDate: vehicle.roadTaxDate || '',
        roadTaxNumber: vehicle.roadTaxNumber || '',
        insuranceDate: vehicle.insuranceDate || vehicle.insuranceExpiry || '',
        permitDate: vehicle.permitDate || '',
        emissionDate: vehicle.emissionDate || '',
        trafficFine: vehicle.trafficFine || '',
        trafficFineDate: vehicle.trafficFineDate || '',
        fuelType: vehicle.fuelType || '',
        color: vehicle.color || '',
        assignedDriver: vehicle.assignedDriver || '',
        status: vehicle.status || 'inactive',
        remarks: vehicle.remarks || '',
        // Files are user-provided during edit; keep null by default
        registrationCardPhoto: null,
        roadTaxPhoto: null,
        pucNumber: vehicle.pucNumber || '',
        pucPhoto: null,
        permitPhoto: null,
        carFrontPhoto: null,
        carLeftPhoto: null,
        carRightPhoto: null,
        carBackPhoto: null,
        carFullPhoto: null,
        // New fields
        insurancePhoto: null,
        interiorPhoto: null,
        speedometerPhoto: null,
        fcPhoto: null,
        driverAgreementType: vehicle.driverAgreementType || ''
      });
    } else {
      setForm({
  registrationNumber: '', model: '', carName: '', brand: '', category: '', investorId: '', ownerName: '', ownerPhone: '', kycStatus: '', manufactureYear: '',
        registrationDate: '', rcExpiryDate: '', roadTaxDate: '', roadTaxNumber: '', insuranceDate: '', permitDate: '', emissionDate: '',
        trafficFine: '', trafficFineDate: '', fuelType: '', color: '', assignedDriver: '', status: 'inactive', remarks: '',
        registrationCardPhoto: null, roadTaxPhoto: null, pucNumber: '', pucPhoto: null, permitPhoto: null, 
        carFrontPhoto: null, carLeftPhoto: null, carRightPhoto: null, carBackPhoto: null, carFullPhoto: null,
        insurancePhoto: null, interiorPhoto: null, speedometerPhoto: null,
        fcPhoto: null,
        driverAgreementType: ''
      });
    }
  }, [vehicle, isOpen]);

  if (!isOpen) return null;

  const validateField = (field, value) => {
    const e = { ...errors };
    const v = (value ?? '').toString();
    const currentYear = new Date().getFullYear();

    switch(field){
      case 'registrationNumber':
        if (!v.trim()) e.registrationNumber = 'Registration number is required';
        else delete e.registrationNumber;
        break;
      case 'model':
        if (!v.trim()) e.model = 'Vehicle model is required';
        else delete e.model;
        break;
      case 'brand':
        // optional
        delete e.brand;
        break;
      case 'ownerPhone':
        if (v && !/^\+?[0-9\s-]{7,15}$/.test(v)) e.ownerPhone = 'Enter a valid phone number';
        else delete e.ownerPhone;
        break;
      case 'manufactureYear':
        if (v) {
          const n = Number(v);
          if (Number.isNaN(n) || n < 1900 || n > currentYear + 1) e.manufactureYear = `Enter a year between 1900 and ${currentYear + 1}`;
          else delete e.manufactureYear;
        } else delete e.manufactureYear;
        break;
      case 'trafficFine':
        if (v) {
          const n = Number(v);
          if (Number.isNaN(n) || n < 0) e.trafficFine = 'Traffic fine must be a positive number';
          else delete e.trafficFine;
        } else delete e.trafficFine;
        break;
      case 'fuelType':
        if (!v.trim()) e.fuelType = 'Select a fuel type';
        else delete e.fuelType;
        break;
      case 'color':
        // optional
        delete e.color;
        break;
      case 'status':
        if (!v.trim()) e.status = 'Select status';
        else delete e.status;
        break;
      default:
        break;
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validateForm = () => {
    const currentYear = new Date().getFullYear();
    const newErrors = {};

    // Required fields
    if (!String(form.registrationNumber || '').trim()) {
      newErrors.registrationNumber = 'Registration number is required';
    }
    if (!String(form.model || '').trim()) {
      newErrors.model = 'Vehicle model is required';
    }
    if (!String(form.fuelType || '').trim()) {
      newErrors.fuelType = 'Select a fuel type';
    }
    if (!String(form.status || '').trim()) {
      newErrors.status = 'Select status';
    }

    // Optional with validation
    if (form.ownerPhone && !/^\+?[0-9\s-]{7,15}$/.test(String(form.ownerPhone))) {
      newErrors.ownerPhone = 'Enter a valid phone number';
    }
    if (form.manufactureYear) {
      const n = Number(form.manufactureYear);
      if (Number.isNaN(n) || n < 1900 || n > currentYear + 1) {
        newErrors.manufactureYear = `Enter a year between 1900 and ${currentYear + 1}`;
      }
    }
    if (form.trafficFine) {
      const n = Number(form.trafficFine);
      if (Number.isNaN(n) || n < 0) {
        newErrors.trafficFine = 'Traffic fine must be a positive number';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    validateField(field, value);
  };

  const handleFileChange = (field, file) => {
    if (previews[field]) URL.revokeObjectURL(previews[field]);
    setForm(prev => ({ ...prev, [field]: file }));
    setPreviews(prev => ({ ...prev, [field]: file ? URL.createObjectURL(file) : undefined }));
  };

  const addNewOption = async (type) => {
    const label = {
      category: 'Car Category',
      brand: 'Brand',
      model: 'Model Name',
      carName: 'Car Name'
    }[type];
    const value = window.prompt(`Add new ${label}`);
    if (!value || !value.trim()) return null;
    try {
      const res = await fetch(`${API_BASE}/api/vehicle-options`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, value: value.trim() })
      });
      if (res.status === 409) {
        toast('Already exists, selecting it');
      } else if (!res.ok) {
        throw new Error('Failed to add option');
      }
      // reload and select
      if (type === 'category') await loadOptions('category', setCategories);
      if (type === 'brand') await loadOptions('brand', setBrands);
      if (type === 'model') await loadOptions('model', setModels);
      if (type === 'carName') await loadOptions('carName', setCarNames);
      return value.trim();
    } catch (e) {
      console.error('addNewOption error', e);
      toast.error('Failed to add option');
      return null;
    }
  };

  const handleSubmit = async () => {
    // final validation before submit — allow submission even if incomplete
    const isValid = validateForm();
    if (!isValid) {
      toast('Form incomplete — submitting anyway');
      // continue to submit despite validation errors
    }
    setLoading(true);
    try {
      const payload = {
        registrationNumber: form.registrationNumber,
        model: form.model,
        category: form.category,
        carName: form.carName,
        brand: form.brand,
        investorId: form.investorId || undefined,
        ownerName: form.ownerName,
        ownerPhone: form.ownerPhone,
        kycStatus: form.kycStatus || undefined,
        year: form.manufactureYear ? Number(form.manufactureYear) : undefined,
        manufactureYear: form.manufactureYear ? Number(form.manufactureYear) : undefined,
        registrationDate: form.registrationDate,
        rcExpiryDate: form.rcExpiryDate,
        roadTaxDate: form.roadTaxDate,
        roadTaxNumber: form.roadTaxNumber || undefined,
        insuranceDate: form.insuranceDate,
        permitDate: form.permitDate,
        emissionDate: form.emissionDate,
        trafficFine: form.trafficFine ? Number(form.trafficFine) : undefined,
        trafficFineDate: form.trafficFineDate,
        fuelType: form.fuelType,
        color: form.color,
        assignedDriver: form.assignedDriver,
        assignedManager: form.assignedManager,
        status: form.status,
        remarks: form.remarks,
        // Files (parent should handle uploading e.g., via FormData)
        registrationCardPhoto: form.registrationCardPhoto || undefined,
        roadTaxPhoto: form.roadTaxPhoto || undefined,
        pucNumber: form.pucNumber || undefined,
        pucPhoto: form.pucPhoto || undefined,
        permitPhoto: form.permitPhoto || undefined,
        carFrontPhoto: form.carFrontPhoto || undefined,
        carLeftPhoto: form.carLeftPhoto || undefined,
        carRightPhoto: form.carRightPhoto || undefined,
        carBackPhoto: form.carBackPhoto || undefined,
        carFullPhoto: form.carFullPhoto || undefined,
        // New photo fields
        insurancePhoto: form.insurancePhoto || undefined,
        interiorPhoto: form.interiorPhoto || undefined,
        fcPhoto: form.fcPhoto || undefined,
        speedometerPhoto: form.speedometerPhoto || undefined,
        driverAgreementType: form.driverAgreementType || undefined
      }; 
      // Delegate saving to parent; expect it to throw on error
      await onSave(payload);
      toast.success('Vehicle saved');
      setLoading(false);
      onClose();
      return;
    } catch (err) {
      console.error('Vehicle save error', err);
      toast.error(err.message || 'Failed to save vehicle');
      setLoading(false);
    }
  };

  const renderUpload = (label, field) => {
    const previewUrl = previews[field];
    const existingUrl = vehicle?.[field];

    return (
      <div>
        <label className="block text-sm font-medium">{label}</label>
        <input
          type="file"
          accept="image/*"
          className="input"
          onChange={(e) => handleFileChange(field, e.target.files?.[0] || null)}
        />
        <div className="mt-2 flex items-start gap-3">
          {(previewUrl || existingUrl) ? (
            <div className="w-28 h-28 rounded-lg border bg-gray-50 overflow-hidden flex items-center justify-center">
              <img
                src={previewUrl || existingUrl}
                alt={label}
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <p className="text-xs text-gray-500">Preview appears after selecting a file</p>
          )}
          {existingUrl && (
            <a
              href={existingUrl}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-blue-600 underline mt-1 inline-block"
            >
              View current
            </a>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={onClose} />
        <div className="relative bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between p-4 border-b">
            <h3 className="text-lg font-medium">{vehicle ? 'Edit Vehicle' : ''}</h3>
            <button className="text-gray-400 hover:text-gray-600" onClick={onClose}><X className="h-5 w-5" /></button>
          </div>

          <div className="p-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Starting block: Category, Brand */}
              <div>
                <label className="block text-sm font-medium">Car Category</label>
                <div className="flex gap-2">
                  <select className="input flex-1" value={form.category} onChange={async (e)=>{
                    const val = e.target.value;
                    if (val === '__ADD__') {
                      const added = await addNewOption('category');
                      if (added) handleChange('category', added);
                    } else handleChange('category', val);
                  }}>
                    <option value="">Select</option>
                    {categories.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                    <option value="__ADD__">+ Add new...</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium">Brand</label>
                <div className="flex gap-2">
                  <select className={`input flex-1 ${errors.brand ? 'border-red-500' : ''}`} value={form.brand} onChange={async (e)=>{
                    const val = e.target.value;
                    if (val === '__ADD__') {
                      const added = await addNewOption('brand');
                      if (added) handleChange('brand', added);
                    } else handleChange('brand', val);
                  }}>
                    <option value="">Select</option>
                    {brands.map((b) => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                    <option value="__ADD__">+ Add new...</option>
                  </select>
                </div>
                {errors.brand && <p className="text-xs text-red-600 mt-1">{errors.brand}</p>}
              </div>

              {/* Next: Model Name, Car Name */}
              {/* <div>
                <label className="block text-sm font-medium">Model Name</label>
                <div className="flex gap-2">
                  <select className={`input flex-1 ${errors.model ? 'border-red-500' : ''}`} value={form.model} onChange={async (e)=>{
                    const val = e.target.value;
                    if (val === '__ADD__') {
                      const added = await addNewOption('model');
                      if (added) handleChange('model', added);
                    } else handleChange('model', val);
                  }}>
                    <option value="">Select</option>
                    {models.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                    <option value="__ADD__">+ Add new...</option>
                  </select>
                </div>
                {errors.model && <p className="text-xs text-red-600 mt-1">{errors.model}</p>}
              </div> */}
              <div>
                <label className="block text-sm font-medium">Car Name</label>
                <div className="flex gap-2">
                  <select className="input flex-1" value={form.carName} onChange={async (e)=>{
                    const val = e.target.value;
                    if (val === '__ADD__') {
                      const added = await addNewOption('carName');
                      if (added) handleChange('carName', added);
                    } else handleChange('carName', val);
                  }}>
                    <option value="">Select</option>
                    {carNames.map((n) => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                    <option value="__ADD__">+ Add new...</option>
                  </select>
                </div>
              </div>

              {/* Next: Select Color, Fuel Type */}
              <div>
                <label className="block text-sm font-medium">Select Color</label>
                <select className={`input ${errors.color ? 'border-red-500' : ''}`} value={form.color} onChange={(e)=>handleChange('color', e.target.value)}>
                  <option value="">Select</option>
                  {COLORS.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                {errors.color && <p className="text-xs text-red-600 mt-1">{errors.color}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium">Fuel Type</label>
                <select className={`input ${errors.fuelType ? 'border-red-500' : ''}`} value={form.fuelType} onChange={(e)=>handleChange('fuelType', e.target.value)}>
                  <option value="">Select</option>
                  <option value="Petrol">Petrol</option>
                  <option value="Diesel">Diesel</option>
                  <option value="CNG">CNG</option>
                  <option value="Electric">Electric</option>
                </select>
                {errors.fuelType && <p className="text-xs text-red-600 mt-1">{errors.fuelType}</p>}
              </div>

              {/* Then: Vehicle No. and Owner details, etc. */}
              <div>
                <label className="block text-sm font-medium">Vehicle No.</label>
                <input className={`input ${errors.registrationNumber ? 'border-red-500' : ''}`} value={form.registrationNumber} onChange={(e)=>handleChange('registrationNumber', e.target.value)} />
                {errors.registrationNumber && <p className="text-xs text-red-600 mt-1">{errors.registrationNumber}</p>}
              </div>
              {/* <div className="relative">
  <label className="block text-sm font-medium">Select Investor</label>

  <div className="relative">
    <input
      type="text"
      className="input pr-8"
      placeholder="Search investor..."
      value={
        investorSearch ||
        (form.investorId
          ? investors.find(i => (i._id || i.id) === form.investorId)?.investorName ||
            investors.find(i => (i._id || i.id) === form.investorId)?.name ||
            investors.find(i => (i._id || i.id) === form.investorId)?.phone ||
            ''
          : '')
      }
      onChange={(e) => {
        setInvestorSearch(e.target.value);
        setShowInvestorDropdown(true);
      }}
      onFocus={() => setShowInvestorDropdown(true)}
    />

    {form.investorId && (
      <button
        type="button"
        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
        onClick={() => {
          handleChange('investorId', '');
          setInvestorSearch('');
        }}
      >
        <X className="h-4 w-4" />
      </button>
    )}
  </div>

  {showInvestorDropdown && (
    <>
      <div
        className="fixed inset-0 z-10"
        onClick={() => setShowInvestorDropdown(false)}
      />

      <div className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
        <div
          className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm"
          onClick={() => {
            handleChange('investorId', '');
            setInvestorSearch('');
            setShowInvestorDropdown(false);
          }}
        >
          <span className="text-gray-500">Select Investor</span>
        </div>

        {investors
          .filter(investor => {
            const searchLower = investorSearch.toLowerCase();
            return (
              (investor.investorName || '').toLowerCase().includes(searchLower) ||
              (investor.name || '').toLowerCase().includes(searchLower) ||
              (investor.phone || '').toLowerCase().includes(searchLower)
            );
          })
          .map(investor => (
            <div
              key={investor._id || investor.id}
              className={`px-3 py-2 hover:bg-blue-50 cursor-pointer text-sm ${
                form.investorId === (investor._id || investor.id)
                  ? 'bg-blue-100'
                  : ''
              }`}
              onClick={() => {
                handleChange('investorId', investor._id || investor.id);
                setInvestorSearch('');
                setShowInvestorDropdown(false);
              }}
            >
              <div className="font-medium">
                {investor.investorName || investor.name}
              </div>
              {investor.phone && (
                <div className="text-xs text-gray-500">
                  {investor.phone}
                </div>
              )}
            </div>
          ))}
      </div>
    </>
  )}
</div> */}

            

              <div>
                <label className="block text-sm font-medium">Owner Name</label>
                <input className="input" value={form.ownerName} onChange={(e)=>handleChange('ownerName', e.target.value)} />
              </div>

              <div>
                <label className="block text-sm font-medium">Owner Phone No.</label>
                <input className={`input ${errors.ownerPhone ? 'border-red-500' : ''}`} value={form.ownerPhone} onChange={(e)=>handleChange('ownerPhone', e.target.value)} />
                {errors.ownerPhone && <p className="text-xs text-red-600 mt-1">{errors.ownerPhone}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium">Manufacture Year</label>
                <input type="number" className={`input ${errors.manufactureYear ? 'border-red-500' : ''}`} value={form.manufactureYear} onChange={(e)=>handleChange('manufactureYear', e.target.value)} />
                {errors.manufactureYear && <p className="text-xs text-red-600 mt-1">{errors.manufactureYear}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium">Registration Date</label>
                <input type="date" className="input" value={form.registrationDate} onChange={(e)=>handleChange('registrationDate', e.target.value)} />
              </div>

              <div>
                <label className="block text-sm font-medium">FC Expiry Date</label>
                <input type="date" className="input" value={form.rcExpiryDate} onChange={(e)=>handleChange('rcExpiryDate', e.target.value)} />
              </div>

              <div>
                <label className="block text-sm font-medium">Road Tax Date</label>
                <input type="input" className="input" value={form.roadTaxDate} onChange={(e)=>handleChange('roadTaxDate', e.target.value)} />
              </div>

              <div>
                <label className="block text-sm font-medium">Insurance Expiry Date</label>
                <input type="date" className="input" value={form.insuranceDate} onChange={(e)=>handleChange('insuranceDate', e.target.value)} />
              </div>

              <div>
                <label className="block text-sm font-medium">Permit Expiry Date</label>
                <input type="date" className="input" value={form.permitDate} onChange={(e)=>handleChange('permitDate', e.target.value)} />
              </div>

              <div>
                <label className="block text-sm font-medium">Car Submit Date</label>
                <input type="date" className="input" value={form.emissionDate} onChange={(e)=>handleChange('emissionDate', e.target.value)} />
              </div>

              {/* <div>
                <label className="block text-sm font-medium">Traffic Fine</label>
                <input type="number" className={`input ${errors.trafficFine ? 'border-red-500' : ''}`} value={form.trafficFine} onChange={(e)=>handleChange('trafficFine', e.target.value)} />
                {errors.trafficFine && <p className="text-xs text-red-600 mt-1">{errors.trafficFine}</p>}
              </div> */}

              {/* <div>
                <label className="block text-sm font-medium">Traffic Fine Date</label>
                <input type="date" className="input" value={form.trafficFineDate} onChange={(e)=>handleChange('trafficFineDate', e.target.value)} />
              </div> */}

             

             

              <div className="relative">
                <label className="block text-sm font-medium">Assign to Driver</label>
                <div className="relative">
                  <input
                    type="text"
                    className="input pr-8"
                    placeholder="Search driver..."
                    value={driverSearch || (form.assignedDriver ? drivers.find(d => d._id === form.assignedDriver)?.name || drivers.find(d => d._id === form.assignedDriver)?.username || drivers.find(d => d._id === form.assignedDriver)?.phone || '' : '')}
                    onChange={(e) => {
                      setDriverSearch(e.target.value);
                      setShowDriverDropdown(true);
                    }}
                    onFocus={() => setShowDriverDropdown(true)}
                  />
                  {form.assignedDriver && (
                    <button
                      type="button"
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      onClick={() => {
                        handleChange('assignedDriver', '');
                        setDriverSearch('');
                      }}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
                {showDriverDropdown && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowDriverDropdown(false)} />
                    <div className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                      <div
                        className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm"
                        onClick={() => {
                          handleChange('assignedDriver', '');
                          setDriverSearch('');
                          setShowDriverDropdown(false);
                        }}
                      >
                        <span className="text-gray-500">Select Driver</span>
                      </div>
                      {drivers
                        .filter(driver => {
                          const searchLower = driverSearch.toLowerCase();
                          return (
                            (driver.name || '').toLowerCase().includes(searchLower) ||
                            (driver.username || '').toLowerCase().includes(searchLower) ||
                            (driver.phone || '').toLowerCase().includes(searchLower) ||
                            (driver.mobile || '').toLowerCase().includes(searchLower)
                          );
                        })
                        .map(driver => (
                          <div
                            key={driver._id}
                            className={`px-3 py-2 hover:bg-blue-50 cursor-pointer text-sm ${form.assignedDriver === driver._id ? 'bg-blue-100' : ''}`}
                            onClick={() => {
                              handleChange('assignedDriver', driver._id);
                              setDriverSearch('');
                              setShowDriverDropdown(false);
                            }}
                          >
                            <div className="font-medium">{driver.name || driver.username || driver.phone}</div>
                            {driver.phone && <div className="text-xs text-gray-500">{driver.phone}</div>}
                          </div>
                        ))}
                    </div>
                  </>
                )}
              </div>
              <div className="relative">
                <label className="block text-sm font-medium">Assign Manager</label>
                <div className="relative">
                  <input
                    type="text"
                    className="input pr-8"
                    placeholder="Search manager..."
                    value={managerSearch || (form.assignedManager ? managers.find(m => m._id === form.assignedManager)?.name || managers.find(m => m._id === form.assignedManager)?.username || managers.find(m => m._id === form.assignedManager)?.email || '' : '')}
                    onChange={(e) => {
                      setManagerSearch(e.target.value);
                      setShowManagerDropdown(true);
                    }}
                    onFocus={() => setShowManagerDropdown(true)}
                  />
                  {form.assignedManager && (
                    <button
                      type="button"
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      onClick={() => {
                        handleChange('assignedManager', '');
                        setManagerSearch('');
                      }}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
                {showManagerDropdown && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowManagerDropdown(false)} />
                    <div className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                      <div
                        className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm"
                        onClick={() => {
                          handleChange('assignedManager', '');
                          setManagerSearch('');
                          setShowManagerDropdown(false);
                        }}
                      >
                        <span className="text-gray-500">Select Manager</span>
                      </div>
                      {managers
                        .filter(manager => {
                          const searchLower = managerSearch.toLowerCase();
                          return (
                            (manager.name || '').toLowerCase().includes(searchLower) ||
                            (manager.username || '').toLowerCase().includes(searchLower) ||
                            (manager.email || '').toLowerCase().includes(searchLower)
                          );
                        })
                        .map(manager => (
                          <div
                            key={manager._id}
                            className={`px-3 py-2 hover:bg-blue-50 cursor-pointer text-sm ${form.assignedManager === manager._id ? 'bg-blue-100' : ''}`}
                            onClick={() => {
                              handleChange('assignedManager', manager._id);
                              setManagerSearch('');
                              setShowManagerDropdown(false);
                            }}
                          >
                            <div className="font-medium">{manager.name || manager.username || manager.email}</div>
                            {manager.email && <div className="text-xs text-gray-500">{manager.email}</div>}
                          </div>
                        ))}
                    </div>
                  </>
                )}
              </div>
              

              <div>
                <label className="block text-sm font-medium">Driver Agreement Type</label>
                <select className={`input`} value={form.driverAgreementType} onChange={(e)=>handleChange('driverAgreementType', e.target.value)}>
                  <option value="">Select</option>
                  <option value="leasing">Leasing</option>
                  <option value="funding">Funding</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium">Status</label>
                <select className={`input ${errors.status ? 'border-red-500' : ''}`} value={form.status} onChange={(e)=>handleChange('status', e.target.value)}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="suspended">Suspended</option>
                </select>
                {errors.status && <p className="text-xs text-red-600 mt-1">{errors.status}</p>}
              </div>

                <div>
                  <label className="block text-sm font-medium">KYC Status</label>
                  <select className="input" value={form.kycStatus} onChange={(e)=>handleChange('kycStatus', e.target.value)}>
                    <option value="">Select</option>
                    <option value="verified">Verified</option>
                    <option value="pending">Pending</option>
                    <option value="rejected">Rejected</option>
                    <option value="incomplete">Incomplete</option>
                  </select>
                </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium">Remarks</label>
                <textarea className="input" rows={2} value={form.remarks} onChange={(e)=>handleChange('remarks', e.target.value)} />
              </div>
            </div>

            <div className="pt-2">
              <h4 className="text-sm font-semibold mb-2">Road Tax & PUC</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium">Road Tax No.</label>
                  <input className="input" value={form.roadTaxNumber} onChange={(e)=>handleChange('roadTaxNumber', e.target.value)} placeholder="Enter road tax number" />
                </div>
                <div>
                  {renderUpload('Road Tax Photo', 'roadTaxPhoto')}
                </div>
                <div>
                  <label className="block text-sm font-medium">PUC Certificate No.</label>
                  <input className="input" value={form.pucNumber} onChange={(e)=>handleChange('pucNumber', e.target.value)} placeholder="Enter PUC certificate number" />
                </div>
                <div>
                  {renderUpload('PUC Photo', 'pucPhoto')}
                </div>
              </div>
            </div>

            <div className="pt-2">
              <h4 className="text-sm font-semibold mb-2">Registration & Permit</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  {renderUpload('Registration Card Photo', 'registrationCardPhoto')}
                </div>
                <div>
                  {renderUpload('Permit Photo', 'permitPhoto')}
                </div>
                <div>
                  {renderUpload('FC Photo', 'fcPhoto')}
                </div>
              </div>
            </div>

            <div className="pt-2">
              <h4 className="text-sm font-semibold mb-2">Insurance & Interior</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  {renderUpload('Insurance Photo', 'insurancePhoto')}
                </div>
                <div>
                  {renderUpload('Interior Photo', 'interiorPhoto')}
                </div>
                <div>
                  {renderUpload('Speedometer Photo', 'speedometerPhoto')}
                </div>
              </div>
            </div>

            <div className="pt-2">
              <h4 className="text-sm font-semibold mb-2">Vehicle Photos</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  {renderUpload('Front Photo', 'carFrontPhoto')}
                </div>
                <div>
                  {renderUpload('Left Side Photo', 'carLeftPhoto')}
                </div>
                <div>
                  {renderUpload('Right Side Photo', 'carRightPhoto')}
                </div>
                <div>
                  {renderUpload('Back Photo', 'carBackPhoto')}
                </div>
                <div className="md:col-span-2">
                  {renderUpload('Full Vehicle Photo', 'carFullPhoto')}
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end p-4 border-t">
            <button className="btn btn-secondary mr-3" onClick={onClose} disabled={loading}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSubmit} disabled={loading}>{loading ? 'Saving...' : 'Save Vehicle'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
