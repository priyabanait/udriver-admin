import { useState, useEffect } from 'react';
import { X, User, Mail, Phone, MapPin, FileText, Upload, Camera, Car, CreditCard, Navigation } from 'lucide-react';
import toast from 'react-hot-toast';

// Razorpay IFSC validation API (public, no key required)
const RAZORPAY_IFSC_API = 'https://ifsc.razorpay.com';
      const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';
export default function DriverModal({ isOpen, onClose, driver = null, onSave }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    // Personal Information
    username: '',
    password: '',
    name: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    latitude: '',
    longitude: '',
    emergencyContact: '',
    emergencyContactSecondary: '',
    emergencyRelation: '',
    emergencyRelationSecondary: '',
    emergencyPhone: '',
    emergencyPhoneSecondary: '',
    
    employeeId: '',
    joinDate: new Date().toISOString().split('T')[0],
    // License & Documents
    licenseNumber: '',
    licenseExpiryDate: '',
    licenseClass: '',
    aadharNumber: '',
    panNumber: '',
    
    // Professional Information
    experience: '',
    previousEmployment: '',
    
    // Plan & Vehicle
    planType: '',
    vehiclePreference: '',
    udbId: '',
    driverNo: '',
    alternateNo: '',
    deposit: '',
    
    // Bank Details
    bankName: '',
    accountNumber: '',
    ifscCode: '',
    accountHolderName: '',
    accountBranchName: '',
    
    // Documents
    profilePhoto: null,
    licenseDocument: null,
    aadharDocument: null,
    aadharDocumentBack: null,
    panDocument: null,
    bankDocument: null,
    electricBillDocument: null,
    electricBillNo: '',
    
    // Status
    status: 'pending',
    kycStatus: 'pending'
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [geocodingLoading, setGeocodingLoading] = useState(false);
  const [documentPreviews, setDocumentPreviews] = useState({});
  const [udbCounter, setUdbCounter] = useState(30);
  const [showPassword, setShowPassword] = useState(false);
  const [passwordIsHashed, setPasswordIsHashed] = useState(false);

  const steps = [
    { id: 1, title: 'Personal Info', icon: User },
    { id: 2, title: 'Documents', icon: FileText },
    { id: 3, title: 'Professional', icon: Car },
    { id: 4, title: 'Banking', icon: CreditCard },
    { id: 5, title: 'Review', icon: FileText }
  ];

  // Helper to format date-like values into yyyy-mm-dd for inputs
  const formatDateForInput = (dateString) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '';
      return date.toISOString().split('T')[0];
    } catch {
      return '';
    }
  };

  useEffect(() => {
    if (driver) {
      setFormData({ 
        ...driver,
        planType: driver.currentPlan || driver.planType || '', // Map currentPlan back to planType
        dateOfBirth: formatDateForInput(driver.dateOfBirth),
        joinDate: formatDateForInput(driver.joinDate),
        licenseExpiryDate: formatDateForInput(driver.licenseExpiryDate),
        // Ensure all required fields have values (prevent undefined)
        username: driver.username || '',
        password: driver.password || '', // prefill if backend returns plaintext (see security note)
        name: driver.name || '',
        email: driver.email || '',
        phone: driver.phone || driver.mobile || '',
        address: driver.address || '',
        city: driver.city || '',
        state: driver.state || '',
        pincode: driver.pincode || '',
        latitude: driver.latitude || '',
        longitude: driver.longitude || '',
        emergencyContact: driver.emergencyContact || '',
        emergencyContactSecondary: driver.emergencyContactSecondary || '',
        emergencyRelation: driver.emergencyRelation || '',
        emergencyRelationSecondary: driver.emergencyRelationSecondary || '',
        emergencyPhone: driver.emergencyPhone || '',
        emergencyPhoneSecondary: driver.emergencyPhoneSecondary || '',
        employeeId: driver.employeeId || '',
        licenseNumber: driver.licenseNumber || '',
        licenseClass: driver.licenseClass || 'LMV',
        aadharNumber: driver.aadharNumber || '',
        panNumber: driver.panNumber || '',
        experience: driver.experience || '',
        previousEmployment: driver.previousEmployment || '',
        vehiclePreference: driver.vehiclePreference || driver.vehicleAssigned || '',
        udbId: driver.udbId || driver.employeeId || '',
        driverNo: driver.driverNo || '',
        alternateNo: driver.alternateNo || '',
        deposit: driver.deposit || '',
        bankName: driver.bankName || '',
        accountNumber: driver.accountNumber || '',
        ifscCode: driver.ifscCode || '',
        accountHolderName: driver.accountHolderName || '',
        accountBranchName: driver.accountBranchName || '',
        electricBillNo: driver.electricBillNo || '',
        status: driver.status || 'pending',
        kycStatus: driver.kycStatus || 'pending'
      });
      // Set document previews for existing documents
      const previews = {};
      ['profilePhoto', 'licenseDocument', 'aadharDocument', 'aadharDocumentBack', 'panDocument', 'bankDocument', 'electricBillDocument'].forEach(key => {
        if (driver[key]) {
          previews[key] = driver[key];
        }
      });
      setDocumentPreviews(previews);
      setCurrentStep(1); // Start from the first step but with filled data

      // Detect hashed password (bcrypt/argon prefixes) and avoid showing it
      const pwd = driver.password || '';
      const isHashed = typeof pwd === 'string' && (pwd.startsWith('$2') || pwd.startsWith('$argon'));
      setPasswordIsHashed(!!isHashed);
    } else {
      // Reset form for new driver
      setFormData({
        username: '',
        password: '',
        name: '',
        email: '',
        phone: '',
        joinDate: new Date().toISOString().split('T')[0],
        dateOfBirth: '',
        address: '',
        city: '',
        state: '',
        pincode: '',
        latitude: '',
        longitude: '',
        emergencyContact: '',
        emergencyContactSecondary: '',
        emergencyRelation: '',
        emergencyRelationSecondary: '',
        emergencyPhone: '',
        emergencyPhoneSecondary: '',
        employeeId: '',
        licenseNumber: '',
        licenseExpiryDate: '',
        licenseClass: 'LMV',
        aadharNumber: '',
        panNumber: '',
        experience: '',
        previousEmployment: '',
        planType: '',
        vehiclePreference: '',
        udbId: '',
        driverNo: '',
        alternateNo: '',
        deposit: '',
        bankName: '',
        accountNumber: '',
        ifscCode: '',
        accountHolderName: '',
        accountBranchName: '',
        electricBillNo: '',
        profilePhoto: null,
        licenseDocument: null,
        aadharDocument: null,
        aadharDocumentBack: null,
        panDocument: null,
        bankDocument: null,
        electricBillDocument: null,
        status: 'pending',
        kycStatus: 'pending'
      });
      setCurrentStep(1);
      setDocumentPreviews({});
      setPasswordIsHashed(false);
    }
    setErrors({});
  }, [driver, isOpen]);

  // When opening the modal for creating a new driver, fetch the latest driver
  // and set the udbCounter so generated IDs continue from the last saved UDB.
  useEffect(() => {
    const initUdbCounter = async () => {
      
      if (!isOpen) return;
      try {
              const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';
        // Fetch computed next UDB from backend
        const res = await fetch(`${API_BASE}/api/drivers/udb/next`);
        if (!res.ok) return;
        const data = await res.json();
        if (data && typeof data.next === 'number') {
          setUdbCounter(data.next);
        }
      } catch (err) {
        // ignore failures; keep default counter
        console.warn('Failed to initialize UDB counter', err);
      }
    };
    initUdbCounter();
  }, [isOpen]);

  // UDB generation is handled by explicit generate button now

  const handleInputChange = async (field, value) => {
    // Simple update for all fields; UDB is generated explicitly via button
    setFormData(prev => ({ ...prev, [field]: value }));

    // Real-time per-field validation (async for IFSC)
    let fieldError = '';
    if (field === 'ifscCode') {
      fieldError = await validateField(field, value);
    } else {
      fieldError = validateField(field, value);
    }
    if (fieldError) {
      setErrors(prev => ({ ...prev, [field]: fieldError }));
    } else if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleGenerateUdb = () => {
    const id = `UDB${String(udbCounter).padStart(4, '0')}`;
    setFormData(prev => ({ ...prev, udbId: id }));
    setUdbCounter(prev => prev + 1);
  };

  const calculateAge = (dateString) => {
    if (!dateString) return null;
    const dob = new Date(dateString);
    if (isNaN(dob.getTime())) return null;
    const diffMs = Date.now() - dob.getTime();
    const ageDt = new Date(diffMs);
    return Math.abs(ageDt.getUTCFullYear() - 1970);
  };

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }

    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        
        // Update coordinates
        setFormData(prev => ({ 
          ...prev, 
          latitude: latitude.toString(), 
          longitude: longitude.toString() 
        }));

        // Reverse geocoding to get address
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`
          );
          const data = await response.json();
          
          if (data && data.address) {
            const address = data.address;
            const fullAddress = data.display_name || '';
            
            setFormData(prev => ({
              ...prev,
              address: fullAddress,
              city: address.city || address.town || address.village || '',
              state: address.state || '',
              pincode: address.postcode || '',
              latitude: latitude.toString(),
              longitude: longitude.toString()
            }));
            
            toast.success('Location captured successfully');
          } else {
            toast.success('Location coordinates captured');
          }
        } catch (error) {
          console.error('Reverse geocoding error:', error);
          toast.success('Location coordinates captured');
        } finally {
          setLocationLoading(false);
        }
      },
      (error) => {
        setLocationLoading(false);
        switch (error.code) {
          case error.PERMISSION_DENIED:
            toast.error('Location permission denied. Please enable location access.');
            break;
          case error.POSITION_UNAVAILABLE:
            toast.error('Location information unavailable.');
            break;
          case error.TIMEOUT:
            toast.error('Location request timed out.');
            break;
          default:
            toast.error('An error occurred while getting location.');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  const getCoordinatesFromAddress = async (address) => {
    if (!address || address.trim().length < 10) {
      return;
    }

    setGeocodingLoading(true);
    try {
      // Build search query with additional context if available
      let searchQuery = address;
      if (formData.city) {
        searchQuery += `, ${formData.city}`;
      }
      if (formData.state) {
        searchQuery += `, ${formData.state}`;
      }
      if (formData.pincode) {
        searchQuery += `, ${formData.pincode}`;
      }

      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1&addressdetails=1`
      );
      const data = await response.json();

      if (data && data.length > 0) {
        const location = data[0];
        setFormData(prev => ({
          ...prev,
          latitude: location.lat,
          longitude: location.lon
        }));
        toast.success('Coordinates fetched successfully');
      } else {
        toast.error('Could not find coordinates for this address');
      }
    } catch (error) {
      console.error('Geocoding error:', error);
      toast.error('Failed to fetch coordinates');
    } finally {
      setGeocodingLoading(false);
    }
  };

  // Fetch driver data by phone/mobile and merge into form for autofill (only fill empty fields)
  const handlePhoneBlur = async (phoneValue) => {
    const digits = String(phoneValue || '').replace(/\D/g, '');
    if (!digits || digits.length < 6) return; // not enough info to search

    try {
      const apiBase = import.meta.env.VITE_API_BASE || 'http://localhost:4000';
      const res = await fetch(`${apiBase}/api/drivers/form/search/${digits}`);
      if (!res.ok) {
        // Not found is fine; do not disturb the form
        return;
      }
      const data = await res.json();
      // Backend returns an array of drivers, get the first match
      const d = Array.isArray(data) ? data[0] : (data.driver || null);
      if (!d) return;

      // Map server driver to form fields safely (only fill missing fields)
      setFormData(prev => {
        const merged = { ...prev };
        const safeSet = (key, value) => {
          if (value === undefined || value === null) return;
          if (merged[key] === undefined || merged[key] === null || merged[key] === '') {
            merged[key] = value;
          }
        };

        safeSet('name', d.name || '');
        safeSet('email', d.email || '');
        // prefer server phone or mobile
        safeSet('phone', d.phone || d.mobile || '');
        safeSet('dateOfBirth', formatDateForInput(d.dateOfBirth));
        safeSet('licenseExpiryDate', formatDateForInput(d.licenseExpiryDate));
        safeSet('licenseNumber', d.licenseNumber || '');
        safeSet('licenseClass', d.licenseClass || 'LMV');
        safeSet('aadharNumber', d.aadharNumber || '');
        safeSet('panNumber', d.panNumber || '');
        safeSet('address', d.address || '');
        safeSet('city', d.city || '');
        safeSet('state', d.state || '');
        safeSet('pincode', d.pincode || '');
        safeSet('latitude', d.latitude || '');
        safeSet('longitude', d.longitude || '');
        safeSet('emergencyContact', d.emergencyContact || '');
        safeSet('emergencyRelation', d.emergencyRelation || '');
        safeSet('emergencyPhone', d.emergencyPhone || '');
        safeSet('emergencyRelationSecondary', d.emergencyRelationSecondary || '');
        safeSet('emergencyPhoneSecondary', d.emergencyPhoneSecondary || '');
        safeSet('employeeId', d.employeeId || '');
        safeSet('experience', d.experience || '');
        safeSet('planType', d.currentPlan || d.planType || '');
        safeSet('vehiclePreference', d.vehiclePreference || d.vehicleAssigned || '');
        safeSet('bankName', d.bankName || '');
        safeSet('accountNumber', d.accountNumber || '');
        safeSet('ifscCode', d.ifscCode || '');
        safeSet('accountHolderName', d.accountHolderName || '');
        safeSet('accountBranchName', d.accountBranchName || '');
        safeSet('udbId', d.udbId || '');
        safeSet('driverNo', d.driverNo || '');
        safeSet('alternateNo', d.alternateNo || '');
        safeSet('deposit', d.deposit !== undefined && d.deposit !== null ? String(d.deposit) : '');

        // Prefer server udbId if available (overwrite any generated suggestion)
        if (d.udbId) merged.udbId = d.udbId;

        // Document previews
        const docKeys = ['profilePhoto','licenseDocument','aadharDocument','aadharDocumentBack','panDocument','bankDocument','electricBillDocument'];
        setDocumentPreviews(prevDocs => {
          const next = { ...prevDocs };
          for (const k of docKeys) {
            if ((d[k]) && !next[k]) next[k] = d[k];
          }
          return next;
        });

        toast.success('Auto-filled available data from database');
        return merged;
      });
    } catch (err) {
      console.error('Auto-fill fetch failed:', err);
    }
  };

  // Validation disabled per user request — stubbed to always succeed
  const validateField = async (field, value) => {
    // Intentionally no validation; return empty string to indicate no error
    return '';
  };

  //     if (d > now) return 'Join date cannot be in the future';
  //     return '';
  //   }


  //   if (field === 'address') {
  //     if (!value || !value.trim()) return 'Address is required';
  //     if (value.trim().length < 10) return 'Please enter complete address (min 10 characters)';
  //     return '';
  //   }
  //   if (field === 'pincode') {
  //     if (!value || !value.trim()) return 'Pincode is required';
  //     if (!/^\d{6}$/.test(value.trim())) return 'Enter valid 6 digit pincode';
  //     return '';
  //   }
  //   // if (field === 'licenseNumber') {
  //   //   if (!value || !value.trim()) return 'License number is required';
  //   //   // Format: XX[0-9]{13} (2 characters followed by 13 numbers)
  //   //   if (!/^[A-Z]{2}[0-9]{13}$/.test(value.toUpperCase())) return 'Enter valid license number (e.g., DL0120160000000)';
  //   //   return '';
  //   // }
  //   if (field === 'licenseExpiryDate') {
  //     if (!value) return 'License expiry date is required';
  //     const expiryDate = new Date(value);
  //     const today = new Date();
  //     if (expiryDate <= today) return 'License must not be expired';
  //     return '';
  //   }
  //   if (field === 'aadharNumber') {
  //     if (!value || !value.trim()) return 'Aadhar number is required';
  //     const digits = value.replace(/\D/g, '');
  //     if (digits.length !== 12) return 'Aadhar must be exactly 12 digits';
  //     // Verhoeff algorithm validation could be added here
  //     if (!/^\d{4}\s?\d{4}\s?\d{4}$/.test(value.trim())) return 'Enter valid Aadhar number (e.g., 1234 5678 9012)';
  //     return '';
  //   }
  //   if (field === 'panNumber') {
  //     if (!value || !value.trim()) return 'PAN number is required';
  //     if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(value.toUpperCase())) return 'Enter valid PAN (e.g., ABCDE1234F)';
  //     return '';
  //   }
  //   if (field === 'experience') {
  //     if (!value) return 'Experience is required';
  //     return '';
  //   }
  //   if (field === 'planType') {
  //     if (!value) return 'Plan type is required';
  //     return '';
  //   }
  //   if (field === 'bankName') {
  //     if (!value || !value.trim()) return 'Bank name is required';
  //     if (!/^[a-zA-Z\s]{2,50}$/.test(value.trim())) return 'Enter valid bank name';
  //     return '';
  //   }
  //   if (field === 'accountNumber') {
  //     if (!value || !value.trim()) return 'Account number is required';
  //     const digits = value.replace(/\D/g, '');
  //     if (digits.length < 9 || digits.length > 18) return 'Account number should be 9-18 digits';
  //     if (!/^\d+$/.test(value.trim())) return 'Account number should only contain digits';
  //     return '';
  //   }
  //   if (field === 'ifscCode') {
  //     if (!value || !value.trim()) return 'IFSC code is required';
  //     if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(value.toUpperCase())) return 'Enter valid IFSC code (e.g., SBIN0123456)';
  //     // Call Razorpay IFSC API for validation
  //     try {
  //       const res = await fetch(`${RAZORPAY_IFSC_API}/${encodeURIComponent(value)}`);
  //       if (!res.ok) {
  //         return 'Invalid IFSC code (not found in bank database)';
  //       }
  //       // Optionally, you can parse and use the returned bank details here
  //     } catch (err) {
  //       return 'Could not validate IFSC code (API error)';
  //     }
  //     return '';
  //   }
  //   if (field === 'accountHolderName') {
  //     if (!value || !value.trim()) return 'Account holder name is required';
  //     if (!/^[a-zA-Z\s]{2,50}$/.test(value.trim())) return 'Enter valid account holder name';
  //     return '';
  //   }
  //   if (field === 'accountBranchName') {
  //     if (!value || !value.trim()) return 'Account branch name is required';
  //     if (!/^[a-zA-Z\s]{2,50}$/.test(value.trim())) return 'Enter valid branch name';
  //     return '';
  //   }
  //   return '';
  // };

  const handleFileUpload = (field, file) => {
    if (file) {
      // Convert file to base64 for both storage and preview
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64String = e.target.result;
        setFormData(prev => ({ ...prev, [field]: base64String }));
        setDocumentPreviews(prev => ({ ...prev, [field]: base64String }));
      };
      reader.readAsDataURL(file);
    }
  };

  const validateStep = async (step) => {
    // Validation disabled: always allow progressing between steps
    setErrors({});
    return true;
  };


  const handleNext = async () => {
    const valid = await validateStep(currentStep);
    if (valid) {
      setCurrentStep(prev => Math.min(prev + 1, 5));
    } else {
      // Scroll to first error
      const firstError = Object.keys(errors)[0];
      if (firstError) {
        console.log('Validation errors:', errors);
        toast.error(`Please fix errors in ${firstError}`);
      }
    }
  };

  const handlePrev = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    // Validate all steps before final submit
    for (let step = 1; step <= 4; step++) {
      const ok = await validateStep(step);
      if (!ok) {
        setCurrentStep(step);
        return;
      }
    }

    setLoading(true);
    try {
      const apiBase = import.meta.env.VITE_API_BASE || 'http://localhost:4000';
      
      // Check if driver with this phone already exists (only for new drivers)
      if (!driver && formData.phone) {
        try {
          const searchRes = await fetch(`${apiBase}/api/drivers/form/search/${formData.phone}`);
          if (searchRes.ok) {
            const existingDrivers = await searchRes.json();
            if (existingDrivers && existingDrivers.length > 0) {
              const existingDriver = existingDrivers[0];
              const confirmUpdate = window.confirm(
                `A driver with phone number ${formData.phone} already exists (${existingDriver.name || 'No name'}). Do you want to update this driver instead?`
              );
              if (confirmUpdate) {
                // Switch to update mode
                setFormData(existingDriver);
                // Will trigger another submit in update mode
                setLoading(false);
                return;
              }
            }
          }
        } catch (searchError) {
          console.warn('Could not check for existing driver:', searchError);
          // Continue with creation anyway
        }
      }
      
      const driverData = {
        ...formData,
        mobile: formData.phone, // Map phone to mobile for backend
        id: driver?.id || Date.now(),
        joinDate: formData.joinDate || driver?.joinDate || new Date().toISOString().split('T')[0],
        lastActive: new Date().toISOString(),
        totalTrips: driver?.totalTrips || 0,
        totalEarnings: driver?.totalEarnings || 0,
        rating: driver?.rating || 0,
        emergencyContact: formData.emergencyContact || driver?.emergencyContact,
        emergencyContactSecondary: formData.emergencyContactSecondary || driver?.emergencyContactSecondary,
        emergencyRelation: formData.emergencyRelation || driver?.emergencyRelation,
        emergencyRelationSecondary: formData.emergencyRelationSecondary || driver?.emergencyRelationSecondary,
        emergencyPhone: formData.emergencyPhone || driver?.emergencyPhone,
        emergencyPhoneSecondary: formData.emergencyPhoneSecondary || driver?.emergencyPhoneSecondary,
        vehicleAssigned: formData.vehiclePreference,
        currentPlan: formData.planType, // Map planType to currentPlan for display
        planAmount: 800, // Default plan amount, can be calculated based on plan type
        // Include existing document URLs if they haven't been changed
        profilePhoto: formData.profilePhoto || driver?.profilePhoto,
        licenseDocument: formData.licenseDocument || driver?.licenseDocument,
        aadharDocument: formData.aadharDocument || driver?.aadharDocument,
        aadharDocumentBack: formData.aadharDocumentBack || driver?.aadharDocumentBack,
        panDocument: formData.panDocument || driver?.panDocument,
        bankDocument: formData.bankDocument || driver?.bankDocument,
        electricBillDocument: formData.electricBillDocument || driver?.electricBillDocument
      };

      // Filter out undefined or null values to prevent overwriting existing data
      Object.keys(driverData).forEach(key => {
        if (driverData[key] === undefined || driverData[key] === null) {
          delete driverData[key];
        }
      });

      console.log('Submitting driver data:', driverData);
      
      // Call backend API - use _id if in edit mode, otherwise use id
      let endpoint = `${apiBase}/api/drivers`;
      let method = 'POST';
      
      if (driver) {
        const driverId = driver._id || driver.id;
        endpoint = `${apiBase}/api/drivers/${driverId}`;
        method = 'PUT';
      }
      
      console.log(`${method} ${endpoint}`);
      
      const response = await fetch(endpoint, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(driverData)
      });

      const responseData = await response.json();
      
      if (!response.ok) {
        console.error('Backend error response:', responseData);
        const errorMessage = responseData.message || responseData.error || `HTTP ${response.status}`;
        throw new Error(errorMessage);
      }

      console.log('Driver saved successfully:', responseData);
      toast.success(driver ? 'Driver updated successfully' : 'Driver created successfully');
      
      // Call onSave callback if provided
      if (onSave) {
        await onSave(responseData);
      }
      
      onClose();
    } catch (error) {
      console.error('Submit error:', error);
      toast.error(error.message || 'Failed to save driver');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900">Personal Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Username *
                </label>
                <input
                  type="text"
                  value={formData.username || ''}
                  onChange={(e) => handleInputChange('username', e.target.value)}
                  className={`input ${errors.username ? 'border-red-300' : ''}`}
                  placeholder="Choose a username"
                />
                {errors.username && <p className="mt-1 text-sm text-red-600">{errors.username}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Password {driver ? <span className="text-sm font-normal"></span> : '*'}
                </label>

                <div className="flex items-center space-x-2">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password || ''}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    className={`input ${errors.password ? 'border-red-300' : ''}`}
                    placeholder={driver ? 'Leave blank to keep existing' : 'Create a password'}
                  />

                  {/* If password is hashed, we cannot reveal it */}
                  {!passwordIsHashed ? (
                    <button
                      type="button"
                      onClick={() => setShowPassword((s) => !s)}
                      className="text-sm text-blue-600 hover:underline"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? 'Hide' : 'Show'}
                    </button>
                  ) : (
                    <span className="text-sm text-gray-500">Hashed — cannot display</span>
                  )}
                </div>

                {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password}</p>}

                {passwordIsHashed && (
                  <p className="mt-1 text-sm text-gray-500">Password is stored hashed and cannot be shown; enter a new password to change it.</p>
                )}

              </div>
<div className="flex flex-col gap-3 max-w-sm">
  {/* Editable Input showing UDB ID */}
  <input
    type="text"
    placeholder="UDB ID"
    value={formData.udbId}
    onChange={(e) =>
      setFormData({ ...formData, udbId: e.target.value })
    }
    className="border p-2 rounded"
  />

  {/* Button to generate next ID */}
  <button
    type="button"
    onClick={handleGenerateUdb}
    className="bg-blue-600 text-white p-2 rounded hover:bg-blue-700"
  >
    Generate UDB ID
  </button>
</div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name 
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className={`input ${errors.name ? 'border-red-300' : ''}`}
                  placeholder="Enter full name"
                />
                {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
              </div>

   
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address 
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className={`input ${errors.email ? 'border-red-300' : ''}`}
                  placeholder="Enter email address"
                />
                {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
              </div>

             <div>
  <label className="block text-sm font-medium text-gray-700 mb-2">
    Phone Number 
  </label>

  <input
    type="tel"
    value={formData.phone || formData.driverNo || ''}
    onChange={(e) => handleInputChange('phone', e.target.value)}
    onBlur={(e) => handlePhoneBlur(e.target.value)}
    className={`input ${errors.phone ? 'border-red-300' : ''}`}
    placeholder="+91 98765 43210"
  />

  {errors.phone && (
    <p className="mt-1 text-sm text-red-600">{errors.phone}</p>
  )}
</div>
<div>
  <label className="block text-sm font-medium text-gray-700 mb-2">
    Alternate Phone
  </label>
  <input
    type="tel"
    value={formData.alternateNo || ''}
    onChange={(e) => handleInputChange('alternateNo', e.target.value)}
    className="input"
    placeholder="+91 98765 43210"
  />
</div>

<div>
  <label className="block text-sm font-medium text-gray-700 mb-2">
    Date of Birth 
  </label>
  <input
    type="date"
    value={formData.dateOfBirth}
    onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
    className={`input ${errors.dateOfBirth ? 'border-red-300' : ''}`}
  />
  {errors.dateOfBirth && (
    <p className="mt-1 text-sm text-red-600">{errors.dateOfBirth}</p>
  )}
</div>

<div>
  <label className="block text-sm font-medium text-gray-700 mb-2">
    Join Date
  </label>
  <input
    type="date"
    value={formData.joinDate}
    onChange={(e) => handleInputChange('joinDate', e.target.value)}
    className={`input ${errors.joinDate ? 'border-red-300' : ''}`}
  />
  {errors.joinDate && (
    <p className="mt-1 text-sm text-red-600">{errors.joinDate}</p>
  )}
</div>

             

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Address
                </label>
                <textarea
                  value={formData.address || ''}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  className="input"
                  rows={3}
                  placeholder="Enter complete address"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  City
                </label>
                <input
                  type="text"
                  value={formData.city || ''}
                  onChange={(e) => handleInputChange('city', e.target.value)}
                  className="input"
                  placeholder="Enter city"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  State
                </label>
                <input
                  type="text"
                  value={formData.state || ''}
                  onChange={(e) => handleInputChange('state', e.target.value)}
                  className="input"
                  placeholder="Enter state"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Pincode
                </label>
                <input
                  type="text"
                  value={formData.pincode || ''}
                  onChange={(e) => handleInputChange('pincode', e.target.value)}
                  className="input"
                  placeholder="Enter pincode"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Latitude
                </label>
                <input
                  type="text"
                  value={formData.latitude || ''}
                  onChange={(e) => handleInputChange('latitude', e.target.value)}
                  className="input"
                  placeholder="Enter latitude"
                  
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Longitude
                </label>
                <input
                  type="text"
                  value={formData.longitude || ''}
                  onChange={(e) => handleInputChange('longitude', e.target.value)}
                  className="input"
                  placeholder="Enter longitude"
                
                />
              </div>

              {/* <div className="md:col-span-2">
                <button
                  type="button"
                  onClick={getCurrentLocation}
                  disabled={locationLoading}
                  className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50"
                >
                  {locationLoading ? 'Getting Location...' : 'Capture Current Location'}
                </button>
              </div> */}

              <h4 className="text-md font-medium text-gray-900 md:col-span-2">Emergency Contacts</h4>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Emergency Contact Name 
                </label>
                <input
                  type="text"
                  value={formData.emergencyContact || ''}
                  onChange={(e) => handleInputChange('emergencyContact', e.target.value)}
                  className="input"
                  placeholder="Enter emergency contact name"
                />
              </div>
               <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Secondary Emergency Contact Name
                </label>
                <input
                  type="text"
                  value={formData.emergencyContactSecondary || ''}
                  onChange={(e) => handleInputChange('emergencyContactSecondary', e.target.value)}
                  className="input"
                  placeholder="Enter secondary contact name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Relation Reference 1 
                </label>
                <input
                  type="text"
                  value={formData.emergencyRelation || ''}
                  onChange={(e) => handleInputChange('emergencyRelation', e.target.value)}
                  className="input"
                  placeholder="e.g., Wife, Brother, Sister"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Relation Reference 2 
                </label>
                <input
                  type="text"
                  value={formData.emergencyRelationSecondary || ''}
                  onChange={(e) => handleInputChange('emergencyRelationSecondary', e.target.value)}
                  className="input"
                  placeholder="e.g., Wife, Brother, Sister"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
             Reference 1 Contact No.
                </label>
                <input
                  type="tel"
                  value={formData.emergencyPhone || ''}
                  onChange={(e) => handleInputChange('emergencyPhone', e.target.value)}
                  className="input"
                  placeholder="+91 98765 43210"
                />
              </div>

             


              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                Reference 2 Contact No.
                </label>
                <input
                  type="tel"
                  value={formData.emergencyPhoneSecondary || ''}
                  onChange={(e) => handleInputChange('emergencyPhoneSecondary', e.target.value)}
                  className="input"
                  placeholder="+91 98765 43210"
                />
              </div>   </div>

          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900">Documents & License</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  License Number *
                </label>
                <input
                  type="text"
                  value={formData.licenseNumber}
                  onChange={(e) => handleInputChange('licenseNumber', e.target.value)}
                  className={`input ${errors.licenseNumber ? 'border-red-300' : ''}`}
                  placeholder="DL1234567890"
                />
                {errors.licenseNumber && <p className="mt-1 text-sm text-red-600">{errors.licenseNumber}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  License Expiry Date *
                </label>
                <input
                  type="date"
                  value={formData.licenseExpiryDate}
                  onChange={(e) => handleInputChange('licenseExpiryDate', e.target.value)}
                  className={`input ${errors.licenseExpiryDate ? 'border-red-300' : ''}`}
                />
                {errors.licenseExpiryDate && <p className="mt-1 text-sm text-red-600">{errors.licenseExpiryDate}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  License Class
                </label>
                <select
                  value={formData.licenseClass}
                  onChange={(e) => handleInputChange('licenseClass', e.target.value)}
                  className="input"
                >
                  <option value="LMV">LMV (Light Motor Vehicle)</option>
                  <option value="HMV">HMV (Heavy Motor Vehicle)</option>
                  <option value="MCWG">MCWG (Motorcycle With Gear)</option>
                  <option value="MCWOG">MCWOG (Motorcycle Without Gear)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Aadhar Number *
                </label>
                <input
                  type="text"
                  value={formData.aadharNumber}
                  onChange={(e) => handleInputChange('aadharNumber', e.target.value)}
                  className={`input ${errors.aadharNumber ? 'border-red-300' : ''}`}
                  placeholder="1234 5678 9012"
                />
                {errors.aadharNumber && <p className="mt-1 text-sm text-red-600">{errors.aadharNumber}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  PAN Number *
                </label>
                <input
                  type="text"
                  value={formData.panNumber}
                  onChange={(e) => handleInputChange('panNumber', e.target.value)}
                  className={`input ${errors.panNumber ? 'border-red-300' : ''}`}
                  placeholder="ABCDE1234F"
                />
                {errors.panNumber && <p className="mt-1 text-sm text-red-600">{errors.panNumber}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Electric Bill No.
                </label>
                <input
                  type="text"
                  value={formData.electricBillNo}
                  onChange={(e) => handleInputChange('electricBillNo', e.target.value)}
                  className="input"
                  placeholder="Enter electric bill number"
                />
              </div>
            </div>
            

            {/* Document Upload Section */}
            <div className="space-y-4">
              <h4 className="text-md font-medium text-gray-900">Upload Documents</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { key: 'profilePhoto', label: 'Profile Photo', accept: 'image/*' },
                  { key: 'licenseDocument', label: 'License Document', accept: '.pdf,.jpg,.jpeg,.png' },
                  { key: 'aadharDocument', label: 'Aadhar Front Side Document', accept: '.pdf,.jpg,.jpeg,.png' },
                  { key: 'aadharDocumentBack', label: 'Aadhar Back Side Document', accept: '.pdf,.jpg,.jpeg,.png' },
                  { key: 'panDocument', label: 'PAN Document', accept: '.pdf,.jpg,.jpeg,.png' },
                  { key: 'electricBillDocument', label: 'Electric Bill', accept: '.pdf,.jpg,.jpeg,.png' }
                ].map(({ key, label, accept }) => (
                  <div key={key} className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                    <div className="text-center">
                      {documentPreviews[key] ? (
                        <img 
                          src={documentPreviews[key].startsWith('data:') ? documentPreviews[key] : documentPreviews[key] + '?t=' + new Date().getTime()} 
                          alt={label} 
                          className="mx-auto h-20 w-20 object-cover rounded" 
                        />
                      ) : (
                        <Upload className="mx-auto h-12 w-12 text-gray-400" />
                      )}
                      <div className="mt-2">
                        <label className="cursor-pointer">
                          <span className="text-sm font-medium text-primary-600 hover:text-primary-500">
                            Upload {label}
                          </span>
                          <input
                            type="file"
                            className="hidden"
                            accept={accept}
                            onChange={(e) => handleFileUpload(key, e.target.files[0])}
                          />
                        </label>
                        <p className="text-xs text-gray-500 mt-1">PDF, JPG, PNG up to 5MB</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900">Professional Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Driving Experience *
                </label>
                <select
                  value={formData.experience}
                  onChange={(e) => handleInputChange('experience', e.target.value)}
                  className={`input ${errors.experience ? 'border-red-300' : ''}`}
                >
                  <option value="">Select Experience</option>
                  <option value="0-1">0-1 years</option>
                  <option value="1-3">1-3 years</option>
                  <option value="3-5">3-5 years</option>
                  <option value="5-10">5-10 years</option>
                  <option value="10+">10+ years</option>
                </select>
                {errors.experience && <p className="mt-1 text-sm text-red-600">{errors.experience}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Plan Type *
                </label>
                <select
                  value={formData.planType}
                  onChange={(e) => handleInputChange('planType', e.target.value)}
                  className={`input ${errors.planType ? 'border-red-300' : ''}`}
                >
                  <option value="">Select Plan</option>
                  <option value="uber">Uber Plan</option>
                  <option value="daily">Daily Plan</option>
                 
                </select>
                {errors.planType && <p className="mt-1 text-sm text-red-600">{errors.planType}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Vehicle Preference
                </label>
                <select
                  value={formData.vehiclePreference}
                  onChange={(e) => handleInputChange('vehiclePreference', e.target.value)}
                  className="input"
                >
                  <option value="">Select Vehicle Type</option>
                  <option value="Dzire ">Dzire</option>
                  <option value="WagonR ">WagonR</option>
                  <option value="Aura ">Aura</option>
                  <option value="Eartiga">Eartiga</option>
                  <option value="Spresso ">Spresso</option>
                  <option value="Triber ">Triber</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Previous Employment
                </label>
                <textarea
                  value={formData.previousEmployment}
                  onChange={(e) => handleInputChange('previousEmployment', e.target.value)}
                  className="input"
                  rows={3}
                  placeholder="Previous job details, experience with ride-sharing platforms, etc."
                />
              </div>

              
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900">Banking Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bank Name *
                </label>
                <input
                  type="text"
                  value={formData.bankName}
                  onChange={(e) => handleInputChange('bankName', e.target.value)}
                  className={`input ${errors.bankName ? 'border-red-300' : ''}`}
                  placeholder="State Bank of India"
                />
                {errors.bankName && <p className="mt-1 text-sm text-red-600">{errors.bankName}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Account Branch Name *
                </label>
                <input
                  type="text"
                  value={formData.accountBranchName}
                  onChange={(e) => handleInputChange('accountBranchName', e.target.value)}
                  className={`input ${errors.accountBranchName ? 'border-red-300' : ''}`}
                  placeholder="Enter branch name"
                />
                {errors.accountBranchName && <p className="mt-1 text-sm text-red-600">{errors.accountBranchName}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Account Number *
                </label>
                <input
                  type="text"
                  value={formData.accountNumber}
                  onChange={(e) => handleInputChange('accountNumber', e.target.value)}
                  className={`input ${errors.accountNumber ? 'border-red-300' : ''}`}
                  placeholder="1234567890123456"
                />
                {errors.accountNumber && <p className="mt-1 text-sm text-red-600">{errors.accountNumber}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  IFSC Code *
                </label>
                <input
                  type="text"
                  value={formData.ifscCode}
                  onChange={(e) => handleInputChange('ifscCode', e.target.value)}
                  className={`input ${errors.ifscCode ? 'border-red-300' : ''}`}
                  placeholder="SBIN0001234"
                />
                {errors.ifscCode && <p className="mt-1 text-sm text-red-600">{errors.ifscCode}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Account Holder Name *
                </label>
                <input
                  type="text"
                  value={formData.accountHolderName}
                  onChange={(e) => handleInputChange('accountHolderName', e.target.value)}
                  className={`input ${errors.accountHolderName ? 'border-red-300' : ''}`}
                  placeholder="Account holder name"
                />
                {errors.accountHolderName && <p className="mt-1 text-sm text-red-600">{errors.accountHolderName}</p>}
              </div>
            </div>

            {/* Bank Document Upload */}
            <div className="space-y-4">
              <h4 className="text-md font-medium text-gray-900">Bank Document</h4>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                <div className="text-center">
                  {documentPreviews.bankDocument ? (
                    <img 
                      src={documentPreviews.bankDocument.startsWith('data:') ? documentPreviews.bankDocument : documentPreviews.bankDocument + '?t=' + new Date().getTime()} 
                      alt="Bank Document" 
                      className="mx-auto h-20 w-20 object-cover rounded" 
                    />
                  ) : (
                    <Upload className="mx-auto h-12 w-12 text-gray-400" />
                  )}
                  <div className="mt-2">
                    <label className="cursor-pointer">
                      <span className="text-sm font-medium text-primary-600 hover:text-primary-500">
                        Upload Bank Statement/Passbook
                      </span>
                      <input
                        type="file"
                        className="hidden"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => handleFileUpload('bankDocument', e.target.files[0])}
                      />
                    </label>
                    <p className="text-xs text-gray-500 mt-1">PDF, JPG, PNG up to 5MB</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900">Review & Submit</h3>
            
            <div className="bg-gray-50 rounded-lg p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-700">Name:</span>
                  <span className="ml-2 text-gray-900">{formData.name}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Email:</span>
                  <span className="ml-2 text-gray-900">{formData.email}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Phone:</span>
                  <span className="ml-2 text-gray-900">{formData.phone}</span>
                </div>
                 <div>
                  <span className="font-medium text-gray-700">Alternate No:</span>
                  <span className="ml-2 text-gray-900">{formData.mobile}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Address:</span>
                  <span className="ml-2 text-gray-900">{formData.address}</span>
                </div>
                {formData.latitude && formData.longitude && (
                  <div>
                    <span className="font-medium text-gray-700">GPS Location:</span>
                    <span className="ml-2 text-gray-900">
                      {parseFloat(formData.latitude).toFixed(6)}, {parseFloat(formData.longitude).toFixed(6)}
                    </span>
                  </div>
                )}
                <div>
                  <span className="font-medium text-gray-700">License:</span>
                  <span className="ml-2 text-gray-900">{formData.licenseNumber}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Plan:</span>
                  <span className="ml-2 text-gray-900">{formData.planType}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Experience:</span>
                  <span className="ml-2 text-gray-900">{formData.experience}</span>
                </div>
                {/* <div>
                  <span className="font-medium text-gray-700">Driver No:</span>
                  <span className="ml-2 text-gray-900">{formData.driverNo}</span>
                </div> */}
               
                <div>
                  <span className="font-medium text-gray-700">UDB ID:</span>
                  <span className="ml-2 text-gray-900">{formData.udbId || formData.employeeId}</span>
                </div> 
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h4 className="text-sm font-medium text-yellow-800 mb-2">Important Notes:</h4>
              <ul className="text-sm text-yellow-700 space-y-1">
                <li>• Driver will be created with "Pending" status</li>
                <li>• KYC verification will be initiated automatically</li>
                <li>• Driver will receive login credentials via email</li>
                <li>• All uploaded documents will be verified by the admin team</li>
              </ul>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={onClose} />
        
        <div className="relative bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {driver ? 'Edit Driver' : 'Add New Driver'}
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Step {currentStep} of {steps.length}: {steps.find(s => s.id === currentStep)?.title}
              </p>
              {driver && (
                <p className="text-sm text-gray-500 mt-1">
                  ID: <span className="font-medium">{driver.id || 'N/A'}</span>
                  {driver.driverNo && (<span className="ml-3">Driver No: <span className="font-medium">{driver.driverNo}</span></span>)}
                  {driver.udbId && (<span className="ml-3">UDB ID: <span className="font-medium">{driver.udbId}</span></span>)}
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Progress Steps */}
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              {steps.map((step, index) => {
                const Icon = step.icon;
                const isActive = step.id === currentStep;
                const isCompleted = step.id < currentStep;
                
                return (
                  <div key={step.id} className="flex items-center">
                    <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
                      isActive 
                        ? 'border-primary-600 bg-primary-600 text-white' 
                        : isCompleted 
                        ? 'border-green-600 bg-green-600 text-white'
                        : 'border-gray-300 bg-white text-gray-400'
                    }`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <span className={`ml-2 text-sm font-medium ${
                      isActive ? 'text-primary-600' : isCompleted ? 'text-green-600' : 'text-gray-500'
                    }`}>
                      {step.title}
                    </span>
                    {index < steps.length - 1 && (
                      <div className={`ml-4 w-8 h-0.5 ${
                        isCompleted ? 'bg-green-600' : 'bg-gray-300'
                      }`} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Form Content */}
          <div className="p-6">
            {renderStepContent()}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
              disabled={loading}
            >
              Cancel
            </button>
            
            <div className="flex space-x-3">
              {currentStep > 1 && (
                <button
                  type="button"
                  onClick={handlePrev}
                  className="btn btn-secondary"
                  disabled={loading}
                >
                  Previous
                </button>
              )}
              
              {currentStep < 5 ? (
                <button
                  type="button"
                  onClick={handleNext}
                  className="btn btn-primary"
                  disabled={loading}
                >
                  Next
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSubmit}
                  className="btn btn-primary"
                  disabled={loading}
                >
                  {loading ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      {driver ? 'Updating...' : 'Creating...'}
                    </div>
                  ) : (
                    driver ? 'Update Driver' : 'Create Driver'
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}