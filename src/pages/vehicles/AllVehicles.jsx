import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, 
  Filter, 
  Plus, 
  Eye, 
  Edit, 
  Trash2,
  Download,
  Phone,
  Mail,
  Car,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/Table';
import { formatCurrency, formatDate } from '../../utils';
import { useAuth } from '../../contexts/AuthContext';
import { PermissionGuard } from '../../components/guards/PermissionGuards';
import { PERMISSIONS } from '../../utils/permissions';
import VehicleModal from '../../components/vehicles/VehicleModal';
import VehicleDetailModal from '../../components/vehicles/VehicleDetailModal';
import toast from 'react-hot-toast';

export default function VehiclesList() {
  useAuth();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [kycFilter, setKycFilter] = useState('all');
  const [showVehicleModal, setShowVehicleModal] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [vehiclesData, setVehiclesData] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [managers, setManagers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [paginationInfo, setPaginationInfo] = useState({});
  const [totalVehicles, setTotalVehicles] = useState(0);
  
  // Server-side filtering is now used via API, so we just use vehiclesData directly
  // The filtered logic has been moved to the backend search endpoint
  const paginatedVehicles = vehiclesData;
  
  // Auth helpers for deployed backend
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

  // Ensure we consistently have a usable id across mixed backends
  // ID used by backend API: strictly the numeric vehicleId sequence
  const resolveApiVehicleId = useCallback((vehicle) => {
    if (!vehicle) return undefined;
    const id = vehicle.vehicleId;
    return typeof id === 'number' ? id : Number.isFinite(Number(id)) ? Number(id) : undefined;
  }, []);

  const normalizeVehicle = useCallback((vehicle) => {
    if (!vehicle) return vehicle;
    // Do NOT override server's vehicleId; just ensure number type if possible
    const numericId = typeof vehicle.vehicleId === 'number' ? vehicle.vehicleId : Number(vehicle.vehicleId);
    return Number.isFinite(numericId) ? { ...vehicle, vehicleId: numericId } : { ...vehicle };
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    try{
       const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';
       
       // Build vehicle query params
       let vehicleParams = new URLSearchParams({
         page: currentPage.toString(),
         limit: pageSize.toString()
       });
       if (searchTerm && searchTerm.trim()) {
         vehicleParams.append('q', searchTerm.trim());
       }
       if (statusFilter && statusFilter !== 'all') {
         vehicleParams.append('status', statusFilter);
       }
       if (kycFilter && kycFilter !== 'all') {
         vehicleParams.append('kycStatus', kycFilter);
       }
       
       // Use search endpoint if search term or filters are provided
       const vehicleEndpoint = (searchTerm && searchTerm.trim()) || statusFilter !== 'all' || kycFilter !== 'all'
         ? `${API_BASE}/api/vehicles/search?${vehicleParams.toString()}`
         : `${API_BASE}/api/vehicles?${vehicleParams.toString()}`;
       
        const [vehicleRes, driverRes, managerRes] = await Promise.all([
          fetch(vehicleEndpoint),
          fetch(`${API_BASE}/api/drivers?page=1&limit=100`),
          fetch(`${API_BASE}/api/managers?limit=100`)
        ]);
        if(!vehicleRes.ok) { throw new Error('Failed to load vehicles'); }
        if(!driverRes.ok) { throw new Error('Failed to load drivers'); }
        if(!managerRes.ok) { throw new Error('Failed to load managers'); }
        const vehicleResult = await vehicleRes.json();
        const driverResult = await driverRes.json();
        const managerResult = await managerRes.json();
        const vehicleData = vehicleResult.data || vehicleResult;
        const driverData = driverResult.data || driverResult;
        const managerData = managerResult.data || managerResult;
        const normalized = Array.isArray(vehicleData) ? vehicleData.map(normalizeVehicle) : [];
        setVehiclesData(normalized);
        setDrivers(driverData);
        setManagers(managerData);
        
        // Store pagination info
        if(vehicleResult.pagination) {
          setPaginationInfo(vehicleResult.pagination);
          setTotalVehicles(vehicleResult.pagination.total || 0);
        }

      }catch(err){
        console.error(err);
        setError(err.message || 'Failed to load vehicles');
        toast.error('Failed to load vehicles');
      }finally{
        setLoading(false);
      }
  };

  useEffect(() => {
    let handleVehicleAssigned = null;
    
    fetchAll();
    
    // Listen for vehicle assignment events to refresh a single vehicle row
    handleVehicleAssigned = async (e) => {
      try {
        const vid = e?.detail?.vehicleId;
        if (!vid) return;
        const id = vid;
        const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';
        const res = await fetch(`${API_BASE}/api/vehicles/${id}`);
        if (!res.ok) return;
        const v = await res.json();
        const n = normalizeVehicle(v);
        setVehiclesData(prev => prev.map(x => resolveApiVehicleId(x) === resolveApiVehicleId(n) ? n : x));
      } catch (err) {
        console.warn('vehicleAssigned handler failed', err);
      }
    };
    window.addEventListener('vehicleAssigned', handleVehicleAssigned);

    return () => {
      if (handleVehicleAssigned) {
        window.removeEventListener('vehicleAssigned', handleVehicleAssigned);
      }
    };
  }, [normalizeVehicle, currentPage, pageSize, searchTerm, statusFilter, kycFilter]);

  // Refetch when search or filters change (with debounce for search)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (currentPage === 1) {
        fetchAll();
      } else {
        setCurrentPage(1); // This will trigger the main useEffect
      }
    }, searchTerm ? 500 : 0); // Debounce search by 500ms
    
    return () => clearTimeout(timeoutId);
  }, [searchTerm, statusFilter, kycFilter]);

  const getStatusBadge = (status) => {
    if (status === 'active') return <Badge variant="success">Active</Badge>;
    if (status === 'inactive') return <Badge variant="danger">Inactive</Badge>;
    return <Badge variant="warning">{status || 'Unknown'}</Badge>;
  };

  const getKycBadge = (kyc) => {
    const k = (kyc || '').toString().toLowerCase();
    if (!k) return <Badge variant="secondary">-</Badge>;
    if (k === 'verified') return <Badge variant="success">Verified</Badge>;
    if (k === 'pending') return <Badge variant="warning">Pending</Badge>;
    if (k === 'rejected') return <Badge variant="danger">Rejected</Badge>;
    return <Badge variant="secondary">{kyc}</Badge>;
  };

  const handleCreateVehicle = () => { setSelectedVehicle(null); setShowVehicleModal(true); };

  const handleEditVehicle = async (vehicle) => {
    // fetch fresh vehicle data from backend before opening modal so all fields are populated
    try{
      setLoading(true);
      const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';
      const apiId = resolveApiVehicleId(vehicle);
      if (apiId == null || Number.isNaN(apiId)) {
        // If we can't resolve an API id, skip fetching and use available data
        setSelectedVehicle(normalizeVehicle(vehicle));
      } else {
        const res = await fetch(`${API_BASE}/api/vehicles/${apiId}`);
        if(!res.ok) { if (handleAuthRedirectIfNeeded(res)) return; throw new Error('Failed to load vehicle'); }
        const data = await res.json();
        setSelectedVehicle(normalizeVehicle(data));
      }
    }catch(err){
      console.error('Failed to fetch vehicle for edit', err);
      // fallback to provided object
      setSelectedVehicle(normalizeVehicle(vehicle));
      toast.error('Failed to load full vehicle details, editing with available data');
    }finally{
      setLoading(false);
      setShowVehicleModal(true);
    }
  };

  const handleViewVehicle = async (vehicle) => {
    try{
      setLoading(true);
      const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';
      const id = resolveApiVehicleId(vehicle);
      if (id == null || Number.isNaN(id)) {
        setSelectedVehicle(normalizeVehicle(vehicle));
      } else {
      const res = await fetch(`${API_BASE}/api/vehicles/${id}`);
      if(!res.ok) { if (handleAuthRedirectIfNeeded(res)) return; throw new Error('Failed to load vehicle'); }
        const data = await res.json();
        setSelectedVehicle(normalizeVehicle(data));
      }
    }catch(err){
      console.error('Failed to fetch vehicle for view', err);
      setSelectedVehicle(normalizeVehicle(vehicle));
      toast.error('Failed to load full vehicle details, showing available data');
    }finally{
      setLoading(false);
      setShowDetailModal(true);
    }
  };

  const handleSaveVehicle = async (vehicleData) => {
    try {
      // Convert file objects to base64 data URLs for API upload
      const fileKeys = [
        'registrationCardPhoto',
        'roadTaxPhoto',
        'pucPhoto',
        'permitPhoto',
        'carFrontPhoto',
        'carLeftPhoto',
        'carRightPhoto',
        'carBackPhoto',
        'carFullPhoto',
        'insurancePhoto',
        'fcPhoto',
        'interiorPhoto',
        'speedometerPhoto'
      ];

      const readFileAsDataUrl = (file) => new Promise((resolve, reject) => {
        if (!file) return resolve(undefined);
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const payload = { ...vehicleData };
      for (const key of fileKeys) {
        const val = payload[key];
        if (val instanceof File) {
          payload[key] = await readFileAsDataUrl(val);
        } else if (val == null) {
          // avoid sending null/undefined
          delete payload[key];
        }
      }

      const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';
      const headers = {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      };

      let response;
      if (selectedVehicle?.vehicleId) {
        // Update existing vehicle
        response = await fetch(`${API_BASE}/api/vehicles/${selectedVehicle.vehicleId}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify(payload)
        });
      } else {
        // Create new vehicle
        response = await fetch(`${API_BASE}/api/vehicles`, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload)
        });
      }

      if (!response.ok) {
        if (handleAuthRedirectIfNeeded(response)) return;
        let serverMsg = '';
        try { const b = await response.json(); serverMsg = b && b.message ? b.message : ''; } catch {}
        const msg = serverMsg || `Failed to ${selectedVehicle ? 'update' : 'create'} vehicle: ${response.status}`;
        throw new Error(msg);
      }

      const resp = await response.json();
      const saved = normalizeVehicle(resp.vehicle || resp);
      // If backend indicated selections were updated, notify other pages to refresh
      if (resp.updatedSelections && resp.updatedSelections > 0) {
        window.dispatchEvent(new CustomEvent('driverSelectionsUpdated', { detail: { count: resp.updatedSelections } }));
      }
      
      setVehiclesData(prev => {
        const exists = prev.find(v => v.vehicleId === saved.vehicleId);
        if (exists) return prev.map(v => v.vehicleId === saved.vehicleId ? saved : v);
        return [...prev, saved];
      });

      // If vehicle has an assignedDriver, ensure driver's record has vehicleAssigned set
      try {
        const assigned = saved.assignedDriver;
        const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';
        const tokenHeaders = getAuthHeaders();
        const assignmentValue = saved.registrationNumber || saved.vehicleNumber || saved._id || saved.vehicleId;

        if (assigned) {
          // find matching driver record
          const foundDriver = drivers.find(d => String(d._id) === String(assigned) || d.username === assigned || d.mobile === assigned || d.phone === assigned);
          if (foundDriver) {
            // update driver.vehicleAssigned
            const drvRes = await fetch(`${API_BASE}/api/drivers/${foundDriver.id || foundDriver._id || foundDriver.id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json', ...(tokenHeaders || {}) },
              body: JSON.stringify({ vehicleAssigned: assignmentValue })
            });
            if (drvRes.ok) {
              const updatedDriver = await drvRes.json();
              setDrivers(prev => prev.map(d => (d.id === (foundDriver.id || foundDriver._id) ? updatedDriver : d)));
            }
          }
        }

        // Also, if this was an update and previously assigned to a different driver, clear that previous driver's vehicleAssigned
        const previousAssigned = selectedVehicle?.assignedDriver;
        if (selectedVehicle && previousAssigned && String(previousAssigned) !== String(assigned)) {
          const prevDrv = drivers.find(d => String(d._id) === String(previousAssigned) || d.username === previousAssigned || d.mobile === previousAssigned || d.phone === previousAssigned);
          if (prevDrv) {
            const clearRes = await fetch(`${API_BASE}/api/drivers/${prevDrv.id || prevDrv._id || prevDrv.id}`, {
              method: 'PUT',
              headers: { 'Content-Type':'application/json', ...(tokenHeaders || {}) },
              body: JSON.stringify({ vehicleAssigned: '' })
            });
            if (clearRes.ok) {
              const cd = await clearRes.json();
              setDrivers(prev => prev.map(d => (d.id === (prevDrv.id || prevDrv._id) ? cd : d)));

            }
          }
        }
      } catch (e) {
        console.warn('Failed to sync driver assignment after vehicle save', e);
      }

      setShowVehicleModal(false);
      setSelectedVehicle(null);
      toast.success(`Vehicle ${selectedVehicle ? 'updated' : 'created'} successfully`);
    } catch (err) {
      console.error('Save vehicle error:', err);
      toast.error(err.message || `Failed to ${selectedVehicle ? 'update' : 'create'} vehicle`);
    }
  };

  const handleDeleteVehicle = async (vehicleOrId) => {
    if (!window.confirm('Delete this vehicle?')) return;
    try{
      const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';
      const resolvedId = typeof vehicleOrId === 'object' ? resolveApiVehicleId(vehicleOrId) : (Number.isFinite(Number(vehicleOrId)) ? Number(vehicleOrId) : undefined);
      if (!resolvedId && resolvedId !== 0) {
        throw new Error('Vehicle not found');
      }
      const res = await fetch(`${API_BASE}/api/vehicles/${resolvedId}`, { method: 'DELETE', headers: getAuthHeaders() });
      if (!res.ok) {
        if (handleAuthRedirectIfNeeded(res)) return;
        const b = await res.json().catch(()=>null);
        throw new Error(b && b.message ? b.message : `Failed to delete vehicle: ${res.status}`);
      }
      setVehiclesData(prev => prev.filter(v => v.vehicleId !== resolvedId));
      toast.success('Vehicle deleted');
    }catch(err){
      console.error(err);
      toast.error(err.message || 'Failed to delete vehicle');
    }
  };


  const handleChangeStatus = async (vehicleId, newStatus) => {
    try{
      const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';
      const res = await fetch(`${API_BASE}/api/vehicles/${vehicleId}`, {
        method: 'PUT',
        headers: { 'Content-Type':'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ status: newStatus })
      });
      if(!res.ok){ if (handleAuthRedirectIfNeeded(res)) return;
        const b = await res.json().catch(()=>null);
        throw new Error(b && b.message ? b.message : `Failed to update status: ${res.status}`);
      }
      const body = await res.json();
      const updatedVehicle = normalizeVehicle(body.vehicle || body);
      setVehiclesData(prev => prev.map(v => v.vehicleId === vehicleId ? updatedVehicle : v));
      if (body.updatedSelections && body.updatedSelections > 0) {
        window.dispatchEvent(new CustomEvent('driverSelectionsUpdated', { detail: { count: body.updatedSelections } }));
      }
      toast.success('Vehicle status updated');
    }catch(err){ console.error(err); toast.error(err.message||'Failed to update status'); }
  };

  const handleChangeKyc = async (vehicleId, newKyc) => {
    try{
      const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';
      const res = await fetch(`${API_BASE}/api/vehicles/${vehicleId}`, {
        method: 'PUT',
        headers: { 'Content-Type':'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ kycStatus: newKyc })
      });
      if(!res.ok){ if (handleAuthRedirectIfNeeded(res)) return;
        const b = await res.json().catch(()=>null);
        throw new Error(b && b.message ? b.message : `Failed to update KYC status: ${res.status}`);
      }
      const body = await res.json();
      const updatedVehicle = normalizeVehicle(body.vehicle || body);
      setVehiclesData(prev => prev.map(v => v.vehicleId === vehicleId ? updatedVehicle : v));
      if (body.updatedSelections && body.updatedSelections > 0) {
        window.dispatchEvent(new CustomEvent('driverSelectionsUpdated', { detail: { count: body.updatedSelections } }));
      }
      toast.success('Vehicle KYC status updated');
    }catch(err){ console.error(err); toast.error(err.message||'Failed to update KYC status'); }
  };

  const handleExport = () => {
    try{
      const headers = [
        'Registration Number', 'Category', 'Brand', 'Model', 'Car Name',
        'Owner Name', 'Owner Phone', 'Investor ID', 'Investor Name',
        'Manufacture Year', 'Color', 'Fuel Type',
        'Registration Date', 'RC Expiry Date', 'Road Tax Date', 'Road Tax Number',
        'Insurance Date', 'Permit Date', 'Emission Date', 'PUC Number',
        'Traffic Fine', 'Traffic Fine Date',
        'Assigned Driver', 'Assigned Manager',
        'KYC Status', 'Status', 'Remarks',
        'Registration Card Photo', 'Road Tax Photo', 'PUC Photo', 'Permit Photo',
        'Car Front Photo', 'Car Left Photo', 'Car Right Photo', 'Car Back Photo', 'Car Full Photo'
      ];
      const escape = v => v==null? '': `"${String(v).replace(/"/g,'""')}"`;
      const rows = vehiclesData.map(v => [
        v.registrationNumber || '',
        v.category || '',
        v.brand || v.make || '',
        v.model || '',
        v.carName || '',
        v.ownerName || '',
        v.ownerPhone || '',
        v.investorId?._id || v.investorId || '',
        v.investorId?.investorName || v.investorId?.name || '',
        v.year || '',
        v.color || '',
        v.fuelType || '',
        formatDate(v.registrationDate) || '',
        formatDate(v.rcExpiryDate) || '',
        formatDate(v.roadTaxDate) || '',
        v.roadTaxNumber || '',
        formatDate(v.insuranceDate) || '',
        formatDate(v.permitDate) || '',
        formatDate(v.emissionDate) || '',
        v.pucNumber || '',
        v.trafficFine || '',
        formatDate(v.trafficFineDate) || '',
        v.assignedDriver || '',
        v.assignedManager || '',
        v.kycStatus || '',
        v.status || '',
        v.remarks || '',
        v.registrationCardPhoto || '',
        v.roadTaxPhoto || '',
        v.pucPhoto || '',
        v.permitPhoto || '',
        v.carFrontPhoto || '',
        v.carLeftPhoto || '',
        v.carRightPhoto || '',
        v.carBackPhoto || '',
        v.carFullPhoto || ''
      ].map(escape));
      const csv = [headers.map(escape).join(','), ...rows.map(r=>r.join(','))].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `vehicles_complete_${new Date().toISOString().slice(0,10)}.csv`; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
      toast.success(`Exported ${vehiclesData.length} vehicles with complete details`);
    }catch(err){ console.error(err); toast.error('Failed to export vehicles'); }
  };

 

  // Stats for top cards
  const activeCount = vehiclesData.filter(v => v.status === 'active').length;
  const assignedCount = vehiclesData.filter(v => v.assignedDriver).length;
  const inactiveCount = vehiclesData.filter(v => v.status === 'inactive').length;
  const kycPendingCount = vehiclesData.filter(v => ((v.kycStatus || v.kyc || '')).toString().toLowerCase() === 'pending').length;
  const totalValue = vehiclesData.reduce((sum, v) => sum + (Number(v.currentValue ?? v.purchasePrice ?? 0) || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Vehicles</h1>
          <p className="text-gray-600">Manage all vehicles</p>
        </div>
        <div className="mt-4 sm:mt-0 flex space-x-3">
          <PermissionGuard permission={PERMISSIONS.REPORTS_EXPORT}>
            <button onClick={handleExport} className="btn btn-secondary flex items-center"><Download className="h-4 w-4 mr-2"/>Export</button>
          </PermissionGuard>
          <PermissionGuard permission={PERMISSIONS.VEHICLES_CREATE}>
            <button onClick={handleCreateVehicle} className="btn btn-primary flex items-center"><Plus className="h-4 w-4 mr-2"/>Add Vehicle</button>
          </PermissionGuard>
        </div>
      </div>

      {/* Top stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
          <Card>
          <CardContent className="p-2">
            <div className="flex items-start">
              <div className="p-2 bg-green-100 rounded-lg">
                <Car className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Vehicles</p>
                <p className="text-2xl font-bold text-gray-900">{paginationInfo.total || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-2">
            <div className="flex items-start">
              <div className="p-2 bg-green-100 rounded-lg">
                <Car className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active Vehicles</p>
                <p className="text-2xl font-bold text-gray-900">{activeCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-2">
            <div className="flex items-start">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Pending KYC</p>
                <p className="text-2xl font-bold text-gray-900">{kycPendingCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

       

        <Card>
          <CardContent className="p-2">
            <div className="flex items-start">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Car className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Assigned Vehicles</p>
                <p className="text-2xl font-bold text-gray-900">{assignedCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-2">
            <div className="flex items-start">
              <div className="p-2 bg-red-100 rounded-lg">
                <XCircle className="h-6 w-6 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Inactive Vehicles</p>
                <p className="text-2xl font-bold text-gray-900">{inactiveCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

      </div>

      {/* Search / Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0 lg:space-x-4">
               <div className="relative flex-1 max-w-md">
  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
  <input
    type="text"
    placeholder="Search vehicles..."
    value={searchTerm}
    onChange={(e) => setSearchTerm(e.target.value)}
    className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder-gray-400 bg-white"
  />
</div>


            {/* Filters */}
            <div className="flex space-x-3">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="border border-gray-300 rounded-md text-sm py-2 px-3 pr-8 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                style={{ minWidth: '130px' }}
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="suspended">Suspended</option>
              </select>

              <select value={kycFilter} onChange={e=>setKycFilter(e.target.value)} className="border border-gray-300 rounded-md text-sm py-2 px-3 pr-8 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white" style={{ minWidth: '150px' }}>
                <option value="all">All KYC Status</option>
                <option value="verified">Verified</option>
                <option value="pending">Pending</option>
                <option value="rejected">Rejected</option>
                <option value="incomplete">Incomplete</option>
              </select>

              <button className="btn btn-secondary flex items-center">
                <Filter className="h-4 w-4 mr-2" />
                More Filters
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Vehicles List ({paginatedVehicles.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading && <div className="p-4 text-center text-sm text-gray-600">Loading vehicles...</div>}
          {error && <div className="p-4 text-center text-sm text-red-600">{error}</div>}
          {!loading && !error && paginatedVehicles.length === 0 && <div className="p-6 text-center text-sm text-gray-600">No vehicle found for the current search or filters.</div>}
          {paginatedVehicles.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Car Category</TableHead>
                  <TableHead>Brand</TableHead>
                  {/* <TableHead>Vehicle Model</TableHead> */}
                  <TableHead>Car Name</TableHead>
                  {/* <TableHead>Color</TableHead> */}
                  {/* <TableHead>Fuel Type</TableHead> */}
                  <TableHead>Vehicle No.</TableHead>
                  <TableHead>Owner Name</TableHead>
                  <TableHead>Owner Phone</TableHead>
                  {/* <TableHead>Manufacture Year</TableHead> */}
                  <TableHead>Registration Date</TableHead>
                  {/* <TableHead>RC Expiry</TableHead> */}
                  {/* <TableHead>Road Tax Date</TableHead> */}
                  {/* <TableHead>Road Tax No.</TableHead> */}
                  {/* <TableHead>Insurance Date</TableHead>
                  <TableHead>Permit Date</TableHead> */}
                  <TableHead>Car Submit Date</TableHead>
                  {/* <TableHead>PUC No.</TableHead> */}
                  {/* <TableHead>Traffic Fine</TableHead>
                  <TableHead>Fine Date</TableHead> */}
                  <TableHead>Assigned Driver</TableHead>
                  <TableHead>Assigned Manager</TableHead>
                
                  <TableHead>KYC Status</TableHead>
                  <TableHead>Car Status</TableHead>
                  
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedVehicles.map((v, index)=> (
                  <TableRow key={index}>
                    <TableCell>{v.category || '-'}</TableCell>
                    <TableCell>{v.brand || v.make || '-'}</TableCell>
                    {/* <TableCell>{v.model}</TableCell> */}
                    <TableCell>{v.carName || '-'}</TableCell>
                    {/* <TableCell>{v.color || '-'}</TableCell> */}
                    {/* <TableCell>{v.fuelType || '-'}</TableCell> */}
                    <TableCell>
                      <div className="font-medium text-gray-900">{v.registrationNumber}</div>
                    </TableCell>
                    <TableCell>{v.ownerName}</TableCell>
                    <TableCell>{v.ownerPhone}</TableCell>
                    {/* <TableCell>{v.year || '-'}</TableCell> */}
                    <TableCell>{formatDate(v.registrationDate)}</TableCell>
                    {/* <TableCell>{formatDate(v.rcExpiryDate || v.rcExpiry)}</TableCell> */}
                    {/* <TableCell>{formatDate(v.roadTaxDate)}</TableCell> */}
                    {/* <TableCell>{v.roadTaxNumber || '-'}</TableCell> */}
                    {/* <TableCell>{formatDate(v.insuranceDate || v.insuranceExpiry)}</TableCell> */}
                    {/* <TableCell>{formatDate(v.permitDate)}</TableCell> */}
                    <TableCell>{formatDate(v.emissionDate)}</TableCell>
                    {/* <TableCell>{v.pucNumber || '-'}</TableCell> */}
                    {/* <TableCell>{v.trafficFine ?? '-'}</TableCell>
                    <TableCell>{formatDate(v.trafficFineDate)}</TableCell> */}
                    <TableCell>{
                      v.assignedDriver ? (
                        typeof v.assignedDriver === 'object' ? (
                          // If backend populated the driver object, prefer the name/username/phone
                          v.assignedDriver.name || v.assignedDriver.username || v.assignedDriver.phone || '-'
                        ) : (
                          // Otherwise treat it as an id/string and try multiple lookup strategies
                          (() => {
                            const key = String(v.assignedDriver);
                            const found = drivers.find(d => (
                              String(d._id) === key ||
                              String(d.id) === key ||
                              (d.username && String(d.username) === key) ||
                              (d.mobile && String(d.mobile) === key) ||
                              (d.phone && String(d.phone) === key)
                            ));
                            if (found) return found.name || found.username || found.phone || key;
                            return key;
                          })()
                        )
                      ) : <Badge variant="warning">Not Assigned</Badge>
                    }</TableCell>
                    <TableCell>{
                      v.assignedManager ? (
                        typeof v.assignedManager === 'object' ? (
                          v.assignedManager.name || v.assignedManager.username || v.assignedManager.email || '-'
                        ) : (
                          (() => {
                            const id = String(v.assignedManager);
                            const found = managers.find(m => m._id === id);
                            return found ? (found.name || found.username || found.email) : id;
                          })()
                        )
                      ) : <Badge variant="warning">Not Assigned</Badge>
                    }</TableCell>
                   
                    <TableCell>{getKycBadge(v.kycStatus || v.kyc || v.kyc_status)}</TableCell>
                    <TableCell>{getStatusBadge(v.status)}</TableCell>
                 
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <button title="View" className="p-1 text-gray-400 hover:text-blue-600" onClick={()=>handleViewVehicle(v)}><Eye className="h-4 w-4"/></button>
                        <PermissionGuard permission={PERMISSIONS.VEHICLES_EDIT}><button title="Edit" className="p-1 text-gray-400 hover:text-green-600" onClick={()=>handleEditVehicle(v)}><Edit className="h-4 w-4"/></button></PermissionGuard>
                        <PermissionGuard permission={PERMISSIONS.VEHICLES_EDIT}>
                          <select value={v.kycStatus || v.kyc || 'incomplete'} onChange={e=>handleChangeKyc(v.vehicleId, e.target.value)} className="border border-gray-300 rounded-md text-sm h-8 py-1 px-2 pr-8 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white" style={{ minWidth: '120px' }}>
                            <option value="verified">Verified</option>
                            <option value="pending">Pending</option>
                            <option value="rejected">Rejected</option>
                            <option value="incomplete">Incomplete</option>
                          </select>
                          <select value={v.status || 'inactive'} onChange={e=>handleChangeStatus(v.vehicleId, e.target.value)} className="border border-gray-300 rounded-md text-sm h-8 py-1 px-2 pr-8 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white" style={{ minWidth: '110px' }}>
                            <option value="active">Active</option>
                            <option value="pending">Pending</option>
                            <option value="inactive">Inactive</option>
                            <option value="suspended">Suspended</option>
                          </select>
                        </PermissionGuard>
                        <PermissionGuard permission={PERMISSIONS.VEHICLES_DELETE}><button title="Delete" className="p-1 text-gray-400 hover:text-red-600" onClick={()=>handleDeleteVehicle(v)}><Trash2 className="h-4 w-4"/></button></PermissionGuard>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
        {paginationInfo.totalPages > 1 && (
  <div className="flex items-center justify-between px-4 py-3 border-t text-sm">
    <div className="text-gray-600">
      Showing {(currentPage - 1) * pageSize + 1} –
      {Math.min(currentPage * pageSize, paginationInfo.total)} of {paginationInfo.total}
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
        Page {currentPage} of {paginationInfo.totalPages}
      </span>

      <button
        disabled={currentPage === paginationInfo.totalPages}
        onClick={() => setCurrentPage(p => p + 1)}
        className="px-3 py-1 border rounded disabled:opacity-50"
      >
        Next
      </button>
    </div>
  </div>
)}

      </Card>

      <VehicleModal isOpen={showVehicleModal} onClose={()=>{setShowVehicleModal(false); setSelectedVehicle(null);}} vehicle={selectedVehicle} onSave={handleSaveVehicle} />
      <VehicleDetailModal isOpen={showDetailModal} onClose={()=>setShowDetailModal(false)} vehicle={selectedVehicle} drivers={drivers} managers={managers} />
    </div>
  );
}
