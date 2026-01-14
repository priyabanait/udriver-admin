import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Search, 
  Filter, 
  Plus, 
  Eye, 
  Edit, 
  Trash2,
  Download,
  FileText,
  Phone,
  Mail,
  Car,
  CheckCircle,
  XCircle,
  Clock,
  User,
  AlertTriangle,
  MoreHorizontal
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/Table';
// data is now fetched from backend API
import { formatCurrency, formatDate } from '../../utils';
import { useAuth } from '../../contexts/AuthContext';
import { PermissionGuard } from '../../components/guards/PermissionGuards';
import { PERMISSIONS } from '../../utils/permissions';
import DriverModal from '../../components/drivers/DriverModal';
import DriverDetailModal from '../../components/drivers/DriverDetailModal';
import toast from 'react-hot-toast';

// URL for the driver dummy CSV in this folder (Vite will serve it as an asset)
const dummyCsvUrl = new URL('./driver dummy.csv', import.meta.url).href;

export default function DriversList() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [planFilter, setPlanFilter] = useState('all');
  const [kycFilter, setKycFilter] = useState('all');
  const [showDriverModal, setShowDriverModal] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [driversData, setDriversData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  // const [documentPreviews, setDocumentPreviews] = useState({});
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedViewDriver, setSelectedViewDriver] = useState(null);
  const [signupCredentials, setSignupCredentials] = useState([]);
  const [dailyPlans, setDailyPlans] = useState([]);
  const [assigningPlanFor, setAssigningPlanFor] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [assigningVehicleFor, setAssigningVehicleFor] = useState(null);
const [vehicleSearch, setVehicleSearch] = useState('');
const [showVehicleDropdown, setShowVehicleDropdown] = useState(null);
  const fileInputRef = useRef();
  const previewMode = useRef(false);
  const [importing, setImporting] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [previewResults, setPreviewResults] = useState(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  // Signature upload handling for agreements
  const signatureFileRef = useRef();
  const [signingFor, setSigningFor] = useState(null);
  const [updatingSignature, setUpdatingSignature] = useState(false);

  const fetchDrivers = async () => {
    setLoading(true);
    setError(null);
    try {
      const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';

      // Fetch manual drivers
      const res = await fetch(`${API_BASE}/api/drivers?unlimited=true`);
      if (!res.ok) throw new Error(`Failed to load drivers: ${res.status}`);
      const result = await res.json();
      const data = result.data || result;
      setDriversData(data);

      // Fetch signup credentials
      const credRes = await fetch(`${API_BASE}/api/drivers/signup/credentials?limit=1000`);
      if (credRes.ok) {
        const credResult = await credRes.json();
        const credData = credResult.data || credResult;
        setSignupCredentials(credData);
      }

      // Fetch daily rent plans for assigning to drivers
      try {
        const plansRes = await fetch(`${API_BASE}/api/daily-rent-plans`);
        if (plansRes.ok) {
          const plansData = await plansRes.json();
          setDailyPlans(plansData);
        }
      } catch (planErr) {
        console.error('Failed to load daily rent plans', planErr);
      }

      // Fetch vehicles so admins can assign vehicles to drivers
      try {
        const vehiclesRes = await fetch(`${API_BASE}/api/vehicles?limit=1000`);
        if (vehiclesRes.ok) {
          const vehiclesData = await vehiclesRes.json();
          const list = vehiclesData.data || vehiclesData;
          setVehicles(Array.isArray(list) ? list : []);
        }
      } catch (vErr) {
        console.error('Failed to load vehicles', vErr);
      }
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to load drivers');
      toast.error('Failed to load drivers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    fetchDrivers();
    return () => { mounted = false; };
  }, []);

  const handleImportClick = () => { previewMode.current = false; if (fileInputRef.current) fileInputRef.current.click(); };
  const handlePreviewClick = () => { previewMode.current = true; if (fileInputRef.current) fileInputRef.current.click(); };

  const handleFileChange = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const isPreview = !!previewMode.current;
    try {
      if (isPreview) setPreviewing(true); else setImporting(true);
      const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';
      const token = localStorage.getItem('udriver_token');
      const fd = new FormData();
      fd.append('file', file);
      const url = isPreview ? `${API_BASE}/api/drivers/import?preview=true` : `${API_BASE}/api/drivers/import`;
      const res = await fetch(url, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: fd
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body && body.message ? body.message : `Import failed: ${res.status}`);
      }

      if (isPreview) {
        setPreviewResults(body);
        setShowPreviewModal(true);
        toast.success(`Preview completed — rows: ${body.results ? body.results.length : 0}`);
      } else {
        toast.success(`Import completed — created ${body.created}, updated ${body.updated}, skipped ${body.skipped}`);
        await fetchDrivers();
      }
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Import failed');
    } finally {
      setPreviewing(false);
      setImporting(false);
      previewMode.current = false;
      if (fileInputRef.current) fileInputRef.current.value = null;
    }
  };

  // Start signature upload for a driver (opens file picker)
  const handleStartSignatureUpload = (driverId) => {
    setSigningFor(driverId);
    if (signatureFileRef.current) signatureFileRef.current.click();
  };

  // Handle selected signature file and upload it as base64 to driver record
  const handleSignatureFileChange = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file || !signingFor) return;
    try {
      setUpdatingSignature(true);
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result;
        const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';
        const token = localStorage.getItem('udriver_token');
        const res = await fetch(`${API_BASE}/api/drivers/${signingFor}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : {}) },
          body: JSON.stringify({ signature: base64, signedAt: new Date().toISOString() })
        });
        if (!res.ok) {
          if (res.status === 401 || res.status === 403) { localStorage.removeItem('udriver_token'); navigate('/login'); return; }
          const b = await res.json().catch(()=>null);
          throw new Error(b && b.message ? b.message : `Failed to upload signature: ${res.status}`);
        }
        const updated = await res.json();
        setDriversData(prev => prev.map(d => (String(d.id || d._id) === String(updated.id || updated._id) ? updated : d)));
        toast.success('Signature uploaded');
      };
      reader.readAsDataURL(file);
    } catch(err) {
      console.error('Signature upload failed:', err);
      toast.error(err.message || 'Failed to upload signature');
    } finally {
      setUpdatingSignature(false);
      setSigningFor(null);
      if (signatureFileRef.current) signatureFileRef.current.value = null;
    }
  };

  const filteredDrivers = driversData.filter(driver => {
    const matchesSearch = (driver.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (driver.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (driver.phone || '').includes(searchTerm) ||
                         (driver.mobile || '').includes(searchTerm) ||
                         (driver.username || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || driver.status === statusFilter;
    const matchesPlan = planFilter === 'all' || driver.currentPlan === planFilter;
    const matchesKyc = kycFilter === 'all' || driver.kycStatus === kycFilter;
    
    return matchesSearch && matchesStatus && matchesPlan && matchesKyc;
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'active':
        return <Badge variant="success">Active</Badge>;
      case 'inactive':
        return <Badge variant="danger">Inactive</Badge>;
      case 'suspended':
        return <Badge variant="warning">Suspended</Badge>;
      case 'pending':
        return <Badge variant="info">Pending</Badge>;
      default:
        return <Badge variant="info">{status}</Badge>;
    }
  };

  const getKycBadge = (status) => {
    switch (status) {
      case 'verified':
        return <Badge variant="success" className="flex items-center"><CheckCircle className="h-3 w-3 mr-1" />Verified</Badge>;
      case 'pending':
        return <Badge variant="warning" className="flex items-center"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case 'rejected':
        return <Badge variant="danger" className="flex items-center"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
      case 'incomplete':
        return <Badge variant="info" className="flex items-center"><AlertTriangle className="h-3 w-3 mr-1" />Incomplete</Badge>;
      default:
        return <Badge variant="info">{status}</Badge>;
    }
  };

  const findAssignedVehicle = (driver) => vehicles.find(v => v.registrationNumber === driver.vehicleAssigned || String(v.vehicleId) === String(driver.vehicleAssigned) || String(v._id) === String(driver.vehicleAssigned) || v.vehicleNumber === driver.vehicleAssigned);

  // State for tracking vehicle status updates in progress
  const [changingVehicleStatusFor, setChangingVehicleStatusFor] = useState(null);

  // Auth helpers for backend requests
  const getAuthHeaders = () => {
    const token = localStorage.getItem('udriver_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const handleAuthRedirectIfNeeded = (res) => {
    if (res && (res.status === 401 || res.status === 403)) {
      localStorage.removeItem('udriver_token');
      toast.error('Session expired. Please log in again');
      navigate('/login');
      return true;
    }
    return false;
  };

  const resolveApiVehicleId = (vehicle) => {
    if (!vehicle) return undefined;
    const id = vehicle.vehicleId ?? vehicle.vehicleId ?? vehicle.vehicleId;
    if (typeof id === 'number') return id;
    if (typeof id === 'string' && id.trim() !== '' && !Number.isNaN(Number(id))) return Number(id);
    return undefined;
  };

  const normalizeVehicle = (v) => {
    if (!v) return v;
    const numericId = typeof v.vehicleId === 'number' ? v.vehicleId : (v.vehicleId ? Number(v.vehicleId) : undefined);
    return numericId !== undefined && !Number.isNaN(numericId) ? { ...v, vehicleId: numericId } : { ...v };
  };

  const handleChangeVehicleStatus = async (vehicle, newStatus) => {
    try {
      const apiId = resolveApiVehicleId(vehicle);
      if (apiId == null) { toast.error('Unable to resolve vehicle API id'); return; }
      setChangingVehicleStatusFor(apiId);
      const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';
      const res = await fetch(`${API_BASE}/api/vehicles/${apiId}`, {
        method: 'PUT',
        headers: { 'Content-Type':'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ status: newStatus })
      });
      if (!res.ok) {
        if (handleAuthRedirectIfNeeded(res)) { setChangingVehicleStatusFor(null); return; }
        const b = await res.json().catch(()=>null);
        throw new Error(b && b.message ? b.message : `Failed to update status: ${res.status}`);
      }
      const body = await res.json();
      const updatedVehicle = normalizeVehicle(body.vehicle || body);
      setVehicles(prev => prev.map(v => resolveApiVehicleId(v) === apiId ? updatedVehicle : v));
      if (body.updatedSelections && body.updatedSelections > 0) {
        window.dispatchEvent(new CustomEvent('driverSelectionsUpdated', { detail: { count: body.updatedSelections } }));
      }
      toast.success('Vehicle status updated');
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Failed to update vehicle status');
    } finally {
      setChangingVehicleStatusFor(null);
    }
  };

  const handleCreateDriver = () => {
    setSelectedDriver(null);
    setShowDriverModal(true);
  }; 

  const handleEditDriver = async (driver) => {
    try {
      // Fetch complete driver data from the backend
      const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';
      const token = localStorage.getItem('udriver_token');
      const res = await fetch(`${API_BASE}/api/drivers/${driver.id}`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });

      if (!res.ok) {
        throw new Error(`Failed to fetch driver details: ${res.status}`);
      }

      const fullDriverData = await res.json();

      // Document preview collection skipped in this build

      setSelectedDriver(fullDriverData);
      setShowDriverModal(true);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load driver details');
    }
  };
useEffect(() => {
  setCurrentPage(1);
}, [filteredDrivers.length]);
  const handleSaveDriver = async (driverData) => {
    try {
      const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';
      const token = localStorage.getItem('udriver_token');
      
      if (selectedDriver) {
        // Update existing driver
        const res = await fetch(`${API_BASE}/api/drivers/${selectedDriver.id}`, {
          method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          },
          body: JSON.stringify(driverData)
        });

        if (!res.ok) {
          if (res.status === 401 || res.status === 403) { localStorage.removeItem('udriver_token'); navigate('/login'); return; }
          throw new Error(`Failed to update driver: ${res.status}`);
        }

        const updatedDriver = await res.json();
        setDriversData(prev => prev.map(driver => 
          driver.id === selectedDriver.id ? updatedDriver : driver
        ));
        toast.success('Driver updated successfully');
      } else {
        // Add new driver
        const res = await fetch(`${API_BASE}/api/drivers?unlimited=true`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          },
          body: JSON.stringify(driverData)
        });

        if (!res.ok) {
          if (res.status === 401 || res.status === 403) { localStorage.removeItem('udriver_token'); navigate('/login'); return; }
          throw new Error(`Failed to create driver: ${res.status}`);
        }

        const newDriver = await res.json();
        setDriversData(prev => [...prev, newDriver]);
        toast.success('Driver created successfully');
      }
      setShowDriverModal(false);
      setSelectedDriver(null);
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Failed to save driver');
    }
  };
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10; // 10 / 25 / 50 jo chaho
const totalPages = Math.ceil(filteredDrivers.length / rowsPerPage);

const paginatedDrivers = filteredDrivers.slice(
(currentPage - 1) * rowsPerPage,
  currentPage * rowsPerPage
);

  const handleDeleteDriver = (driverId) => {
    if (window.confirm('Are you sure you want to delete this driver?')) {
      (async () => {
        try {
          const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';
          const res = await fetch(`${API_BASE}/api/drivers/${driverId}`, {
            method: 'DELETE'
          });

          if (!res.ok) {
            let msg = `Failed to delete driver: ${res.status}`;
            try {
              const body = await res.json();
              if (body && body.message) msg = body.message;
          } catch { /* ignore parse error */ }
            toast.error(msg);
            return;
          }

          // Remove from local state after successful deletion
          setDriversData(prev => prev.filter(driver => driver.id !== driverId));
          toast.success('Driver deleted successfully');
        } catch (err) {
          console.error(err);
          toast.error('Failed to delete driver');
        }
      })();
    }
  };

  // Legacy quick-action handler (replaced by dropdown). Keep a no-op to avoid usage.
  // const handleKycAction = undefined;

  // const handleStatusToggle = undefined;

  const handleChangeDriverStatus = async (driverId, newStatus) => {
    try {
      const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000'||'http://localhost:4000';
      const token = localStorage.getItem('udriver_token');
      const res = await fetch(`${API_BASE}/api/drivers/${driverId}`, {
        method: 'PUT',
        headers: { 'Content-Type':'application/json', ...(token?{ 'Authorization': `Bearer ${token}` }: {}) },
        body: JSON.stringify({ status: newStatus })
      });
      if (!res.ok) {
        let msg = `Failed to update status: ${res.status}`;
        try { const b = await res.json(); if (b && b.message) msg = b.message; } catch { /* ignore */ }
        throw new Error(msg);
      }
      const updated = await res.json();
      setDriversData(prev => prev.map(d => d.id === driverId ? updated : d));
      toast.success('Driver status updated');
    } catch(err) {
      console.error(err);
      toast.error(err.message || 'Failed to update status');
    }
  };

  const handleChangeDriverKyc = async (driverId, newKyc) => {
    try {
        const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';
      const token = localStorage.getItem('udriver_token');
      const res = await fetch(`${API_BASE}/api/drivers/${driverId}`, {
        method: 'PUT',
        headers: { 'Content-Type':'application/json', ...(token?{ 'Authorization': `Bearer ${token}` }: {}) },
        body: JSON.stringify({ kycStatus: newKyc })
      });
      if (!res.ok) {
        let msg = `Failed to update KYC: ${res.status}`;
        try { const b = await res.json(); if (b && b.message) msg = b.message; } catch { /* ignore */ }
        throw new Error(msg);
      }
      const updated = await res.json();
      setDriversData(prev => prev.map(d => d.id === driverId ? updated : d));
      toast.success('Driver KYC status updated');
    } catch(err) {
      console.error(err);
      toast.error(err.message || 'Failed to update KYC');
    }
  };

  const handleAssignPlan = async (driverId, planId) => {
    try {
      if (!planId) {
        // Unassign plan (clear currentPlan)
        const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';
        const token = localStorage.getItem('udriver_token');
        const res = await fetch(`${API_BASE}/api/drivers/${driverId}`, {
          method: 'PUT',
          headers: { 'Content-Type':'application/json', ...(token?{ 'Authorization': `Bearer ${token}` }: {}) },
          body: JSON.stringify({ currentPlan: '', planAmount: 0, planType: '' })
        });
        if (!res.ok) throw new Error(`Failed to unassign plan: ${res.status}`);
        const updated = await res.json();
        setDriversData(prev => prev.map(d => d.id === driverId ? updated : d));
        toast.success('Plan unassigned');
        return;
      }

      const plan = dailyPlans.find(p => (p._id || p.id) === planId || String(p._id) === String(planId));
      if (!plan) throw new Error('Selected plan not found');

      const planAmount = (plan.dailyRentSlabs && plan.dailyRentSlabs[0] && (plan.dailyRentSlabs[0].rentDay || plan.dailyRentSlabs[0].rent)) ? (plan.dailyRentSlabs[0].rentDay || plan.dailyRentSlabs[0].rent) : (plan.weeklyRentSlabs && plan.weeklyRentSlabs[0] ? (plan.weeklyRentSlabs[0].weeklyRent || 0) : 0);

      const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';
      const token = localStorage.getItem('udriver_token');

      setAssigningPlanFor(driverId);

      const res = await fetch(`${API_BASE}/api/drivers/${driverId}`, {
        method: 'PUT',
        headers: { 'Content-Type':'application/json', ...(token?{ 'Authorization': `Bearer ${token}` }: {}) },
        body: JSON.stringify({ currentPlan: plan.name, planAmount, planType: (plan.dailyRentSlabs ? 'daily' : (plan.weeklyRentSlabs ? 'weekly' : '')) })
      });

      if (!res.ok) {
        if (res.status === 401 || res.status === 403) { localStorage.removeItem('udriver_token'); navigate('/login'); return; }
        let msg = `Failed to assign plan: ${res.status}`;
        try { const b = await res.json(); if (b && b.message) msg = b.message; } catch { /* ignore */ }
        throw new Error(msg);
      }

      const updated = await res.json();
      setDriversData(prev => prev.map(d => d.id === driverId ? updated : d));
      toast.success(`Assigned plan "${plan.name}" to driver`);

      // Create a DriverPlanSelection so plan selection works from admin UI
      try {
        const driverObj = driversData.find(d => d.id === driverId || String(d._id) === String(driverId));
        const mobile = (driverObj && (driverObj.phone || driverObj.mobile || driverObj.contact)) ? (driverObj.phone || driverObj.mobile || driverObj.contact) : '';
        if (mobile) {
          const selectedRentSlab = (plan.dailyRentSlabs && plan.dailyRentSlabs.length > 0) ? plan.dailyRentSlabs[0] : (plan.weeklyRentSlabs && plan.weeklyRentSlabs.length > 0 ? plan.weeklyRentSlabs[0] : null);
          const body = {
            planName: plan.name,
            planType: plan.dailyRentSlabs ? 'daily' : 'weekly',
            securityDeposit: plan.securityDeposit || 0,
            rentSlabs: plan.dailyRentSlabs || plan.weeklyRentSlabs || [],
            selectedRentSlab: selectedRentSlab,
            driverMobile: String(mobile).trim(),
            driverUsername: driverObj?.username || ''
          };

          const selRes = await fetch(`${API_BASE}/api/driver-plan-selections/public`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
          });

          if (selRes.ok) {
            const selData = await selRes.json();
            console.log('Admin created selection:', selData.selection);
            toast.success('Plan booking created for driver');
          } else {
            try {
              const errBody = await selRes.json();
              console.warn('Create selection response:', selRes.status, errBody);
              // If selection already exists, show info
              if (selRes.status === 400 && errBody.message) {
                toast(() => <div>{errBody.message}</div>);
              }
            } catch (e) {
              console.warn('Failed to parse selection response', e);
            }
          }
        } else {
          console.warn('Driver mobile not found - skipping plan selection creation');
        }
      } catch (e) {
        console.warn('Failed to create plan selection from admin UI', e);
      }
    } catch (err) {
      console.error('Assign plan error:', err);
      toast.error(err.message || 'Failed to assign plan');
    } finally {
      setAssigningPlanFor(null);
    }
  };

  // Assign or unassign vehicle for a driver
  const handleAssignVehicle = async (driverId, vehicleId) => {
    try {
      if (!driverId) return;
      const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';
      const token = localStorage.getItem('udriver_token');

      // find driver object and previous assignment (if any)
      const driverObj = driversData.find(d => d.id === driverId || String(d._id) === String(driverId));
      const prevAssignment = driverObj ? driverObj.vehicleAssigned : null;

      // Unassign
      if (!vehicleId) {
        setAssigningVehicleFor(driverId);
        const res = await fetch(`${API_BASE}/api/drivers/${driverId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : {}) },
          body: JSON.stringify({ vehicleAssigned: '' })
        });
        if (!res.ok) {
          if (res.status === 401 || res.status === 403) { localStorage.removeItem('udriver_token'); navigate('/login'); return; }
          let msg = `Failed to unassign vehicle: ${res.status}`;
          try { const b = await res.json(); if (b && b.message) msg = b.message; } catch {}
          throw new Error(msg);
        }
        const updated = await res.json();
        setDriversData(prev => prev.map(d => d.id === driverId ? updated : d));

        // Clear previous vehicle's assignedDriver if it exists
        if (prevAssignment) {
          const prevVehicle = vehicles.find(v => (v.registrationNumber === prevAssignment || String(v.vehicleId) === String(prevAssignment) || String(v._id) === String(prevAssignment) || v.vehicleNumber === prevAssignment));
          if (prevVehicle) {
            const prevApiId = resolveApiVehicleId(prevVehicle);
            if (prevApiId != null) {
              try {
                const vr = await fetch(`${API_BASE}/api/vehicles/${prevApiId}`, {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : {}) },
                  body: JSON.stringify({ assignedDriver: '' })
                });
                if (vr.ok) {
                  const vb = await vr.json();
                  const newVehicle = normalizeVehicle(vb.vehicle || vb);
                  setVehicles(prev => prev.map(v => resolveApiVehicleId(v) === prevApiId ? newVehicle : v));
                }
              } catch (e) { console.warn('Failed to clear previous vehicle assignment', e); }
            }
          }
        }

        toast.success('Vehicle unassigned');
        return;
      }

      // Find vehicle record from loaded vehicles list
      const vehicle = vehicles.find(v => (v._id === vehicleId || String(v.vehicleId) === String(vehicleId) || v.registrationNumber === vehicleId || v.vehicleNumber === vehicleId));
      if (!vehicle) throw new Error('Selected vehicle not found');

      const assignmentValue = vehicle.registrationNumber || vehicle.vehicleNumber || vehicle._id || vehicle.vehicleId;
      setAssigningVehicleFor(driverId);

      // Update driver record first
      const drRes = await fetch(`${API_BASE}/api/drivers/${driverId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : {}) },
        body: JSON.stringify({ vehicleAssigned: assignmentValue })
      });

      if (!drRes.ok) {
        if (drRes.status === 401 || drRes.status === 403) { localStorage.removeItem('udriver_token'); navigate('/login'); return; }
        let msg = `Failed to assign vehicle: ${drRes.status}`;
        try { const b = await drRes.json(); if (b && b.message) msg = b.message; } catch { /* ignore */ }
        throw new Error(msg);
      }

      const updatedDriver = await drRes.json();
      setDriversData(prev => prev.map(d => d.id === driverId ? updatedDriver : d));

      // Now update the vehicle record to reflect the assigned driver (use driver._id when available)
      const apiId = resolveApiVehicleId(vehicle);
      const driverIdForVehicle = driverObj?._id || updatedDriver._id || driverId;
      if (apiId != null) {
        const vr = await fetch(`${API_BASE}/api/vehicles/${apiId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : {}) },
          body: JSON.stringify({ assignedDriver: driverIdForVehicle })
        });
        if (!vr.ok) {
          if (vr.status === 401 || vr.status === 403) { localStorage.removeItem('udriver_token'); navigate('/login'); return; }
          let msg = `Failed to update vehicle: ${vr.status}`;
          try { const b = await vr.json(); if (b && b.message) msg = b.message; } catch { /* ignore */ }
          throw new Error(msg);
        }
        const vb = await vr.json();
        const updatedVehicle = normalizeVehicle(vb.vehicle || vb);
        setVehicles(prev => prev.map(v => resolveApiVehicleId(v) === apiId ? updatedVehicle : v));
      }

      // If driver had a previous vehicle assigned which is different, clear it
      if (prevAssignment && prevAssignment !== assignmentValue) {
        const prevVehicle = vehicles.find(v => (v.registrationNumber === prevAssignment || String(v.vehicleId) === String(prevAssignment) || String(v._id) === String(prevAssignment) || v.vehicleNumber === prevAssignment));
        if (prevVehicle) {
          const prevApiId = resolveApiVehicleId(prevVehicle);
          if (prevApiId != null) {
            try {
              const vr2 = await fetch(`${API_BASE}/api/vehicles/${prevApiId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : {}) },
                body: JSON.stringify({ assignedDriver: '' })
              });
              if (vr2.ok) {
                const vb2 = await vr2.json();
                const newVehicle2 = normalizeVehicle(vb2.vehicle || vb2);
                setVehicles(prev => prev.map(v => resolveApiVehicleId(v) === prevApiId ? newVehicle2 : v));
              }
            } catch (e) { console.warn('Failed to clear previous vehicle assignment', e); }
          }
        }
      }

      toast.success(`Assigned vehicle ${assignmentValue} to driver`);
      // Notify other pages (Vehicles) that an assignment changed so they can refresh
      try { window.dispatchEvent(new CustomEvent('vehicleAssigned', { detail: { vehicleId: apiId } })); } catch (e) { /* ignore */ }
    } catch (err) {
      console.error('Assign vehicle error:', err);
      toast.error(err.message || 'Failed to assign vehicle');
    } finally {
      setAssigningVehicleFor(null);
    }
  };

  // Permissions can be referenced directly via <PermissionGuard>, so local vars are not needed

  const handleExportToCSV = () => {
    try {
      // Prepare CSV data with ALL fields from Driver model
      const headers = [
         'Username', 'Password', 'Name', 'Email', 'Phone No.', 'Alternate No.',
        'Date of Birth', 'Address', 'City', 'State', 'Pincode',
        'GPS Latitude', 'GPS Longitude',
        'Emergency Contact Name', 'Secondary Emergency Contact Name ', 'Relation Reference 1','Relation Reference 2', 'Reference 1 Contact No.', 'Reference 2 Contact No.',
        'UDB ID',
        'License Number', 'License Class', 'License Expiry Date',
        'Aadhar Number', 'PAN Number', 'Electric Bill No',
        'Driving Experience', 'Previous Employment',
        'Plan Type', 'Current Plan', 'Plan Amount', 'Vehicle Preference', 'Vehicle Assigned',
        'KYC Status', 'Status',
        'Bank Name', 'Branch Name', 'Account Number', 'IFSC Code', 'Account Holder Name',
        'Profile Photo URL', 'License Document URL', 'Aadhar Front URL', 'Aadhar Back URL',
        'PAN Document URL', 'Bank Document URL', 'Electric Bill Document URL',
        'Join Date'
      ];
      
      const csvData = filteredDrivers.map(driver => [
        // driver.id || driver._id || '',
        driver.username || '',
        driver.password || '',
        driver.name || '',
        driver.email || '',
        driver.phone || '',
        driver.mobile || '',
        driver.dateOfBirth ? formatDate(driver.dateOfBirth) : '',
        driver.address || '',
        driver.city || '',
        driver.state || '',
        driver.pincode || '',
        driver.latitude || '',
        driver.longitude || '',
        driver.emergencyContact || '',
        driver.emergencyContactSecondary || '',
        driver.emergencyRelation || '',
        driver.emergencyRelationSecondary || '',
        driver.emergencyPhone || '',
        driver.emergencyPhoneSecondary || '',
        driver.employeeId || '',
        driver.licenseNumber || '',
        driver.licenseClass || '',
        driver.licenseExpiryDate ? formatDate(driver.licenseExpiryDate) : '',
        driver.aadharNumber || '',
        driver.panNumber || '',
        driver.electricBillNo || '',
        driver.experience || '',
        driver.previousEmployment || '',
        driver.planType || '',
        driver.currentPlan || '',
        driver.planAmount || '',
        driver.vehiclePreference || '',
        driver.vehicleAssigned || '',
        driver.kycStatus || '',
        driver.status || '',
        driver.bankName || '',
        driver.accountBranchName || '',
        driver.accountNumber || '',
        driver.ifscCode || '',
        driver.accountHolderName || '',
        driver.profilePhoto || '',
        driver.licenseDocument || '',
        driver.aadharDocument || '',
        driver.aadharDocumentBack || '',
        driver.panDocument || '',
        driver.bankDocument || '',
        driver.electricBillDocument || '',
        driver.joinDate ? formatDate(driver.joinDate) : ''
      ]);

      // Create CSV content
      const csvContent = [
        headers.join(','),
        ...csvData.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      ].join('\n');

      // Create blob and download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `drivers_complete_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success(`Exported ${filteredDrivers.length} drivers with complete details to CSV`);
    } catch (err) {
      console.error('Export error:', err);
      toast.error('Failed to export drivers');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Drivers</h1>
          <p className="text-gray-600">Manage all drivers and their information</p>
        </div>
        <div className="mt-4 sm:mt-0 flex space-x-3">
          <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleFileChange} style={{ display: 'none' }} />
          <input ref={signatureFileRef} type="file" accept="image/*" onChange={handleSignatureFileChange} style={{ display: 'none' }} />
<button
  onClick={() => {
    const link = document.createElement('a');
    link.href = dummyCsvUrl;
    link.setAttribute('download', 'driver dummy.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }}
  className="btn btn-secondary flex items-center"
>
  <Download className="h-4 w-4 mr-2" />
  Download Reference CSV
</button>

          <PermissionGuard permission={PERMISSIONS.DRIVERS_CREATE}>
            <button onClick={() => fileInputRef.current && fileInputRef.current.click()} className="btn btn-outline flex items-center" disabled={importing}>
              <Download className="h-4 w-4 mr-2" />{importing ? 'Importing...' : 'Import'}
            </button>
          </PermissionGuard>

          <PermissionGuard permission={PERMISSIONS.REPORTS_EXPORT}>
            <button 
              onClick={handleExportToCSV}
              className="btn btn-secondary flex items-center"
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </button>
          </PermissionGuard>
          {/* Hide Add Driver for manager role */}
          
            {/* Only show Add Driver for admin roles, not manager */}
           
              <PermissionGuard permission={PERMISSIONS.DRIVERS_CREATE}>
                <button 
                  onClick={handleCreateDriver}
                  className="btn btn-primary flex items-center"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Driver
                </button>
              </PermissionGuard>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
         <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <User className="h-6 w-6 mb-2 text-green-600" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">Total Drivers</p>
                        <p className="text-2xl font-bold text-gray-900">{driversData.length}</p>
              
                      </div>
                    </div>
                  </CardContent>
                </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <User className="h-6 w-6 text-green-600" />
              </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active Drivers</p>
              <p className="text-2xl font-bold text-gray-900">{driversData.filter(d => d.status === 'active').length}</p>
            </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Eye className="h-6 w-6 text-yellow-600" />
              </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Pending KYC</p>
              <p className="text-2xl font-bold text-gray-900">{driversData.filter(d => d.kycStatus === 'pending').length}</p>
            </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Car className="h-6 w-6 text-blue-600" />
              </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">With Vehicles</p>
              <p className="text-2xl font-bold text-gray-900">{driversData.filter(d => d.vehicleAssigned).length}</p>
            </div>
            </div>
          </CardContent>
        </Card>

        {/* <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Car className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Earnings</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(driversData.reduce((sum, d) => sum + (d.totalEarnings || 0), 0))}
                  </p>
              </div>
            </div>
          </CardContent>
        </Card> */}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0 lg:space-x-4">
            {/* Search */}
           <div className="relative flex-1 max-w-md">
  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
  <input
    type="text"
    placeholder="Search drivers..."
    value={searchTerm}
    onChange={(e) => setSearchTerm(e.target.value)}
    className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder-gray-400 bg-white"
  />
</div>


            {/* Filters */}
            <div className="flex space-x-3">
              {/* <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="border border-gray-300 rounded-md text-sm py-2 px-3 pr-8 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                style={{ minWidth: '130px' }}
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="pending">Pending</option>
              </select> */}

              <select
                value={planFilter}
                onChange={(e) => setPlanFilter(e.target.value)}
                className="border border-gray-300 rounded-md text-sm py-2 px-3 pr-8 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                style={{ minWidth: '150px' }}
              >
                <option value="all">All Plans</option>
                {dailyPlans.map(plan => (
                  <option key={plan._id || plan.id} value={plan.name}>{plan.name}</option>
                ))}
              </select> 

              <select
                value={kycFilter}
                onChange={(e) => setKycFilter(e.target.value)}
                className="border border-gray-300 rounded-md text-sm py-2 px-3 pr-8 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                style={{ minWidth: '150px' }}
              >
                <option value="all">All KYC Status</option>
                <option value="verified">Verified</option>
                <option value="pending">Pending</option>
                <option value="rejected">Rejected</option>
                <option value="incomplete">Incomplete</option>
              </select>

              {/* <button className="btn btn-secondary flex items-center">
                <Filter className="h-4 w-4 mr-2" />
                More Filters
              </button> */}
            </div>
          </div>
        </CardContent>
      </Card>

     

      {/* Drivers Table */}
      <Card>
        <CardHeader>
          <CardTitle>Drivers List ({filteredDrivers.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading && (
            <div className="p-4 text-center text-sm text-gray-600">Loading drivers...</div>
          )}
          {error && (
            <div className="p-4 text-center text-sm text-red-600">{error}</div>
          )}
          {!loading && !error && filteredDrivers.length === 0 && (
            <div className="p-6 text-center text-sm text-gray-600">No drivers found for the current search or filters.</div>
          )}
          {filteredDrivers.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Driver</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>KYC Status</TableHead>
                   <TableHead>Car Status</TableHead>
                   <TableHead>Agreement</TableHead>
                  {/* <TableHead>Status</TableHead> */}
                  {/* <TableHead>Earnings</TableHead> */}
                  {/* <TableHead>Rating</TableHead> */}
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedDrivers.map((driver,index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <div>
                        <div className="font-medium text-gray-900">{driver.name}</div>
                        <div className="text-sm text-gray-500">ID: {driver.udbId || driver.employeeId || ' '}</div>
                        {/* <div className="text-sm text-gray-500">
                          {driver.driverNo ? (
                            <>
                              <span className="mr-2">Driver No: {driver.driverNo}</span>
                              {driver.udbId && (<span>UDB ID: {driver.udbId}</span>)}
                            </>
                          ) : (
                            driver.udbId ? (<>UDB ID: {driver.udbId}</>) : null
                          )}
                        </div> */}
                        <div className="text-sm text-gray-500">Joined: {formatDate(driver.joinDate)}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center text-sm">
                          <Mail className="h-3 w-3 mr-1 text-gray-400" />
                          <span className="text-gray-600">{driver.email}</span>
                        </div>
                        <div className="flex items-center text-sm">
                          <Phone className="h-3 w-3 mr-1 text-gray-400" />
                          <span className="text-gray-600">{driver.phone || driver.driverNo || '—'}</span>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell>
                      <div>
                        <PermissionGuard permission={PERMISSIONS.DRIVERS_EDIT}>
                         <div className="relative" style={{ minWidth: '180px' }}>
  <input
    type="text"
    className="border border-gray-300 rounded-md text-sm h-8 py-1 px-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
    placeholder="Select Vehicle"
    disabled={assigningVehicleFor === driver.id}
    value={
      vehicleSearch ||
      (() => {
        const v = vehicles.find(
          v =>
            v.registrationNumber === driver.vehicleAssigned ||
            String(v.vehicleId) === String(driver.vehicleAssigned) ||
            String(v._id) === String(driver.vehicleAssigned) ||
            v.vehicleNumber === driver.vehicleAssigned
        );
        return v
          ? `${v.registrationNumber || v.vehicleNumber}${v.carName ? ` — ${v.carName}` : v.model ? ` — ${v.model}` : ''}`
          : '';
      })()
    }
    onChange={(e) => {
      setVehicleSearch(e.target.value);
      setShowVehicleDropdown(driver.id);
    }}
    onFocus={() => setShowVehicleDropdown(driver.id)}
  />

  {showVehicleDropdown === driver.id && (
    <>
      {/* click outside */}
      <div
        className="fixed inset-0 z-10"
        onClick={() => setShowVehicleDropdown(null)}
      />

      <div className="absolute z-20 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto text-sm">

        {/* clear */}
        <div
          className="px-2 py-1 text-gray-500 cursor-pointer hover:bg-gray-100"
          onClick={() => {
            handleAssignVehicle(driver.id, '');
            setVehicleSearch('');
            setShowVehicleDropdown(null);
          }}
        >
          Select Vehicle
        </div>

        {/* filtered list */}
        {vehicles
          .filter(
            v =>
              v.status === 'inactive' &&
              ((v.kycStatus || '').toString().toLowerCase() === 'verified')
          )
          .filter(v => {
            const s = vehicleSearch.toLowerCase();
            return (
              v.registrationNumber?.toLowerCase().includes(s) ||
              v.vehicleNumber?.toLowerCase().includes(s) ||
              v.carName?.toLowerCase().includes(s) ||
              v.model?.toLowerCase().includes(s)
            );
          })
          .map(v => {
            const value = v._id || v.vehicleId || v.registrationNumber;
            return (
              <div
                key={value}
                className="px-2 py-1 cursor-pointer hover:bg-blue-50"
                onClick={() => {
                  handleAssignVehicle(driver.id, value);
                  setVehicleSearch('');
                  setShowVehicleDropdown(null);
                }}
              >
                {`${v.registrationNumber || v.vehicleNumber}${v.carName ? ` — ${v.carName}` : v.model ? ` — ${v.model}` : ''}`}
              </div>
            );
          })}

        {/* empty */}
        {vehicles.filter(
          v =>
            v.status === 'inactive' &&
            ((v.kycStatus || '').toString().toLowerCase() === 'verified')
        ).length === 0 && (
          <div className="px-2 py-1 text-gray-400">
            No vehicles available
          </div>
        )}
      </div>
    </>
  )}
</div>

                        </PermissionGuard>

                        {!driver.vehicleAssigned && (
                          <div className="text-sm text-gray-500 mt-1">No Vehicle</div>
                        )}

                        {driver.vehicleAssigned && (
                          <div className="text-sm text-gray-500 mt-1">{driver.vehicleAssigned}</div>
                        )}
                      </div>
                    </TableCell>

                    <TableCell>
                      <div>
                        <PermissionGuard permission={PERMISSIONS.DRIVERS_EDIT}>
                          <select
                            value={(dailyPlans.find(p => p.name === driver.currentPlan)?._id) || ''}
                            onChange={(e) => handleAssignPlan(driver.id, e.target.value)}
                            disabled={assigningPlanFor === driver.id}
                            className="border border-gray-300 rounded-md text-sm h-8 py-1 px-2 pr-8 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                            style={{ minWidth: '160px' }}
                          >
                            <option value="">Select Plan</option>
                            {dailyPlans.map(plan => (
                              <option key={plan._id || plan.id} value={plan._id || plan.id}>{plan.name}</option>
                            ))}
                          </select>
                        </PermissionGuard>

                        {!driver.currentPlan && (
                          <div className="text-sm text-gray-500 mt-1">No Plan</div>
                        )}

                        {driver.currentPlan && (
                          <div className="text-sm text-gray-500 mt-1">{driver.currentPlan} • {formatCurrency(driver.planAmount)}/day</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {getKycBadge(driver.kycStatus)}
                    </TableCell>
                    <TableCell>
                      {findAssignedVehicle(driver) ? (
                        <div>
                          <PermissionGuard permission={PERMISSIONS.VEHICLES_EDIT}>
                            <select
                              value={findAssignedVehicle(driver).status || 'inactive'}
                              onChange={(e) => handleChangeVehicleStatus(findAssignedVehicle(driver), e.target.value)}
                              disabled={changingVehicleStatusFor === resolveApiVehicleId(findAssignedVehicle(driver))}
                              className="border border-gray-300 rounded-md text-sm h-8 py-1 px-2 pr-8 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                              style={{ minWidth: '110px' }}
                            >
                              <option value="active">Active</option>
                              <option value="pending">Pending</option>
                              <option value="inactive">Inactive</option>
                              <option value="suspended">Suspended</option>
                            </select>
                          </PermissionGuard>
                          <div className="text-sm text-gray-500 mt-1">{findAssignedVehicle(driver).registrationNumber || findAssignedVehicle(driver).vehicleNumber || ''}</div>
                        </div>
                      ) : <div className="text-sm text-gray-500">No Vehicle</div>}
                    </TableCell>

                    <TableCell>
                      <div className="flex items-center space-x-2">
                        {driver.signature ? (
                          <>
                            <Badge variant="success" className="flex items-center"><CheckCircle className="h-3 w-3 mr-1" />Signed</Badge>
                            {/* Show daily agreement for drivers on daily plan, otherwise show default agreement */}
                            <a
                              href={( (driver.planType || '').toString().toLowerCase().includes('daily') || dailyPlans.some(p => p.name === driver.currentPlan) ) ? `/driveragreement?driverId=${driver.id || driver._id}` : `/agreement?driverId=${driver.id || driver._id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 underline text-sm ml-2"
                            >
                              View
                            </a>
                          </>
                        ) : (
                          <>
                            <span className="text-sm text-gray-500">Unsigned</span>
                            <button onClick={() => handleStartSignatureUpload(driver.id)} className="text-sm text-blue-600 underline ml-2" disabled={updatingSignature && signingFor === driver.id}>
                              {updatingSignature && signingFor === driver.id ? 'Uploading...' : 'Sign'}
                            </button>
                          </>
                        )}
                      </div>
                    </TableCell>
                    {/* <TableCell>
                      {getStatusBadge(driver.status)}
                    </TableCell> */}
                    {/* <TableCell>
                      <div>
                        <div className="font-medium text-gray-900">{formatCurrency(driver.totalEarnings)}</div>
                        <div className="text-sm text-gray-500">{driver.totalTrips} trips</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <span className="text-yellow-400">★</span>
                        <span className="ml-1 text-sm font-medium">{driver.rating}</span>
                      </div>
                    </TableCell> */}
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={async () => {
                            try {
      const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';
                              const token = localStorage.getItem('udriver_token');
                              const res = await fetch(`${API_BASE}/api/drivers/${driver.id}`, {
                                headers: token ? { 'Authorization': `Bearer ${token}` } : {}
                              });
                              if (!res.ok) throw new Error('Failed to fetch driver details');
                              const driverDetails = await res.json();
                              setSelectedViewDriver(driverDetails);
                              setShowDetailModal(true);
                            } catch (err) {
                              console.error(err);
                              toast.error('Failed to load driver details');
                            }
                          }}
                          className="p-1 text-gray-400 hover:text-blue-600"
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        
                        <PermissionGuard permission={PERMISSIONS.DRIVERS_EDIT}>
                          <button
                            onClick={() => handleEditDriver(driver)}
                            className="p-1 text-gray-400 hover:text-green-600"
                            title="Edit Driver"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                        </PermissionGuard>

                        <PermissionGuard permission={PERMISSIONS.DRIVERS_KYC}>
                          <select
                            value={driver.kycStatus || 'incomplete'}
                            onChange={(e)=>handleChangeDriverKyc(driver.id, e.target.value)}
                            className="border border-gray-300 rounded-md text-sm h-8 py-1 px-2 pr-8 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                            style={{ minWidth: '120px' }}
                          >
                            <option value="verified">Verified</option>
                            <option value="pending">Pending</option>
                            <option value="rejected">Rejected</option>
                            <option value="incomplete">Incomplete</option>
                          </select>
                        </PermissionGuard>
                        {/* <PermissionGuard permission={PERMISSIONS.DRIVERS_EDIT}>
                          <select
                            value={driver.status || 'inactive'}
                            onChange={(e)=>handleChangeDriverStatus(driver.id, e.target.value)}
                            className="border border-gray-300 rounded-md text-sm h-8 py-1 px-2 pr-8 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                            style={{ minWidth: '110px' }}
                          >
                            <option value="active">Active</option>
                            <option value="pending">Pending</option>
                            <option value="inactive">Inactive</option>
                            <option value="suspended">Suspended</option>
                          </select>
                        </PermissionGuard> */}

                        <PermissionGuard permission={PERMISSIONS.DRIVERS_DELETE}>
                          <button
                            onClick={() => handleDeleteDriver(driver.id)}
                            className="p-1 text-gray-400 hover:text-red-600"
                            title="Delete Driver"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </PermissionGuard>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
        
          )}
        </CardContent>
            {filteredDrivers.length > rowsPerPage && (
  <div className="flex items-center justify-between px-4 py-3 border-t text-sm">
    <div className="text-gray-600">
      Showing {(currentPage - 1) * rowsPerPage + 1} –
      {Math.min(currentPage * rowsPerPage, filteredDrivers.length)} of {filteredDrivers.length}
    </div>

    <div className="flex items-center gap-2">
      <button
        disabled={currentPage === 1}
        onClick={() => setCurrentPage(p => p - 1)}
        className="px-3 py-1 border rounded disabled:opacity-50"
      >
        Prev
      </button>

      <span className="px-2">
        Page {currentPage} of {totalPages}
      </span>

      <button
        disabled={currentPage === totalPages}
        onClick={() => setCurrentPage(p => p + 1)}
        className="px-3 py-1 border rounded disabled:opacity-50"
      >
        Next
      </button>
    </div>
  </div>
)}

      </Card>

      {/* Driver Modal */}
      {/* Driver Modal */}
      <DriverModal
        isOpen={showDriverModal}
        onClose={() => {
          setShowDriverModal(false);
          setSelectedDriver(null);
        }}
        driver={selectedDriver}
        onSave={handleSaveDriver}
      />

      {/* Driver Detail Modal */}
      <DriverDetailModal
        isOpen={showDetailModal}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedViewDriver(null);
        }}
        driver={selectedViewDriver}
      />
    </div>
  );
}