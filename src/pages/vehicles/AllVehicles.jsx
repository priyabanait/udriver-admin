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

  useEffect(() => {
    let mounted = true;
    (async function fetchAll(){
      setLoading(true);
      try{
        const API_BASE =  'https://udrive-backend-1igb.vercel.app';
        const [vehicleRes, driverRes, managerRes] = await Promise.all([
          fetch(`${API_BASE}/api/vehicles?limit=1000`),
          fetch(`${API_BASE}/api/drivers?limit=1000`),
          fetch(`${API_BASE}/api/managers?limit=1000`)
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
        if(mounted) setVehiclesData(normalized);
        if(mounted) setDrivers(driverData);
        if(mounted) setManagers(managerData);
      }catch(err){
        console.error(err);
        setError(err.message || 'Failed to load vehicles');
        toast.error('Failed to load vehicles');
      }finally{
        if(mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [normalizeVehicle]);

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
      const API_BASE = import.meta.env.VITE_API_BASE || 'https://udrive-backend-1igb.vercel.app';
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
      const API_BASE = import.meta.env.VITE_API_BASE || 'https://udrive-backend-1igb.vercel.app';
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
        'carFullPhoto'
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

      const API_BASE = import.meta.env.VITE_API_BASE || 'https://udrive-backend-1igb.vercel.app';
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

      const saved = normalizeVehicle(await response.json());
      
      setVehiclesData(prev => {
        const exists = prev.find(v => v.vehicleId === saved.vehicleId);
        if (exists) return prev.map(v => v.vehicleId === saved.vehicleId ? saved : v);
        return [...prev, saved];
      });

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
      const API_BASE = import.meta.env.VITE_API_BASE || 'https://udrive-backend-1igb.vercel.app';
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
      const API_BASE = import.meta.env.VITE_API_BASE || 'https://udrive-backend-1igb.vercel.app';
      const res = await fetch(`${API_BASE}/api/vehicles/${vehicleId}`, {
        method: 'PUT',
        headers: { 'Content-Type':'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ status: newStatus })
      });
      if(!res.ok){ if (handleAuthRedirectIfNeeded(res)) return;
        const b = await res.json().catch(()=>null);
        throw new Error(b && b.message ? b.message : `Failed to update status: ${res.status}`);
      }
      const updated = await res.json();
      setVehiclesData(prev => prev.map(v => v.vehicleId === vehicleId ? updated : v));
      toast.success('Vehicle status updated');
    }catch(err){ console.error(err); toast.error(err.message||'Failed to update status'); }
  };

  const handleChangeKyc = async (vehicleId, newKyc) => {
    try{
      const API_BASE = import.meta.env.VITE_API_BASE || 'https://udrive-backend-1igb.vercel.app';
      const res = await fetch(`${API_BASE}/api/vehicles/${vehicleId}`, {
        method: 'PUT',
        headers: { 'Content-Type':'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ kycStatus: newKyc })
      });
      if(!res.ok){ if (handleAuthRedirectIfNeeded(res)) return;
        const b = await res.json().catch(()=>null);
        throw new Error(b && b.message ? b.message : `Failed to update KYC status: ${res.status}`);
      }
      const updated = await res.json();
      setVehiclesData(prev => prev.map(v => v.vehicleId === vehicleId ? updated : v));
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

  const filtered = vehiclesData.filter(v => {
    const q = searchTerm.trim().toLowerCase();
    const matchesQ = !q 
      || (v.registrationNumber||'').toLowerCase().includes(q) 
      || (v.model||'').toLowerCase().includes(q) 
      || (v.carName||'').toLowerCase().includes(q)
      || (v.brand||v.make||'').toLowerCase().includes(q)
      || (v.category||'').toLowerCase().includes(q)
      || (v.ownerName||'').toLowerCase().includes(q);
    const matchesStatus = statusFilter === 'all' || v.status === statusFilter;
    const matchesKyc = kycFilter === 'all' || ((v.kycStatus || v.kyc || '').toString().toLowerCase() === kycFilter);
    return matchesQ && matchesStatus && matchesKyc;
  });

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
          <PermissionGuard permission={PERMISSIONS.DRIVERS_CREATE}>
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

        {/* <Card>
          <CardContent className="p-2">
            <div className="flex items-start">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Car className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Value</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalValue)}</p>
              </div>
            </div>
          </CardContent>
        </Card> */}
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
          <CardTitle>Vehicles List ({filtered.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading && <div className="p-4 text-center text-sm text-gray-600">Loading vehicles...</div>}
          {error && <div className="p-4 text-center text-sm text-red-600">{error}</div>}
          {!loading && !error && filtered.length === 0 && <div className="p-6 text-center text-sm text-gray-600">No vehicle found for the current search or filters.</div>}
          {filtered.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Car Category</TableHead>
                  <TableHead>Brand</TableHead>
                  <TableHead>Vehicle Model</TableHead>
                  <TableHead>Car Name</TableHead>
                  {/* <TableHead>Color</TableHead> */}
                  <TableHead>Fuel Type</TableHead>
                  <TableHead>Vehicle No.</TableHead>
                  <TableHead>Owner Name</TableHead>
                  <TableHead>Owner Phone</TableHead>
                  <TableHead>Manufacture Year</TableHead>
                  <TableHead>Registration Date</TableHead>
                  {/* <TableHead>RC Expiry</TableHead> */}
                  <TableHead>Road Tax Date</TableHead>
                  {/* <TableHead>Road Tax No.</TableHead> */}
                  <TableHead>Insurance Date</TableHead>
                  <TableHead>Permit Date</TableHead>
                  <TableHead>Car Submit Date</TableHead>
                  <TableHead>PUC No.</TableHead>
                  {/* <TableHead>Traffic Fine</TableHead>
                  <TableHead>Fine Date</TableHead> */}
                  <TableHead>Assigned Driver</TableHead>
                  <TableHead>Assigned Manager</TableHead>
                  <TableHead>Driver Rent Days</TableHead>
                  <TableHead>KYC Status</TableHead>
                  <TableHead>Car Status</TableHead>
                  <TableHead>Remarks</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((v, index)=> (
                  <TableRow key={index}>
                    <TableCell>{v.category || '-'}</TableCell>
                    <TableCell>{v.brand || v.make || '-'}</TableCell>
                    <TableCell>{v.model}</TableCell>
                    <TableCell>{v.carName || '-'}</TableCell>
                    {/* <TableCell>{v.color || '-'}</TableCell> */}
                    <TableCell>{v.fuelType || '-'}</TableCell>
                    <TableCell>
                      <div className="font-medium text-gray-900">{v.registrationNumber}</div>
                    </TableCell>
                    <TableCell>{v.ownerName}</TableCell>
                    <TableCell>{v.ownerPhone}</TableCell>
                    <TableCell>{v.year || '-'}</TableCell>
                    <TableCell>{formatDate(v.registrationDate)}</TableCell>
                    {/* <TableCell>{formatDate(v.rcExpiryDate || v.rcExpiry)}</TableCell> */}
                    {/* <TableCell>{formatDate(v.roadTaxDate)}</TableCell> */}
                    <TableCell>{v.roadTaxNumber || '-'}</TableCell>
                    <TableCell>{formatDate(v.insuranceDate || v.insuranceExpiry)}</TableCell>
                    <TableCell>{formatDate(v.permitDate)}</TableCell>
                    <TableCell>{formatDate(v.emissionDate)}</TableCell>
                    <TableCell>{v.pucNumber || '-'}</TableCell>
                    {/* <TableCell>{v.trafficFine ?? '-'}</TableCell>
                    <TableCell>{formatDate(v.trafficFineDate)}</TableCell> */}
                    <TableCell>{
                      v.assignedDriver
                        ? (() => {
                            const found = drivers.find(d => d._id === v.assignedDriver);
                            return found ? (found.name || found.username || found.phone) : v.assignedDriver;
                          })()
                        : <Badge variant="warning">Not Assigned</Badge>
                    }</TableCell>
                    <TableCell>{
                      v.assignedManager
                        ? (() => {
                            const found = managers.find(m => m._id === v.assignedManager);
                            return found ? (found.name || found.username || found.email) : v.assignedManager;
                          })()
                        : <Badge variant="warning">Not Assigned</Badge>
                    }</TableCell>
                    <TableCell>{
                      v.rentStartDate
                        ? (() => {
                            // Calculate total active days
                            let totalDays = 0;
                            const start = new Date(v.rentStartDate);
                            // If paused, use paused date as end for last active period
                            if (v.rentPausedDate && v.status === 'inactive') {
                              const paused = new Date(v.rentPausedDate);
                              totalDays = Math.max(1, Math.floor((paused - start) / (1000 * 60 * 60 * 24)) + 1);
                              return <span>{totalDays} days <Badge variant="warning">Paused</Badge></span>;
                            } else if (v.rentPausedDate && v.status === 'active') {
                              // If resumed, add previous days to current active period
                              const paused = new Date(v.rentPausedDate);
                              const beforePause = Math.max(1, Math.floor((paused - start) / (1000 * 60 * 60 * 24)) + 1);
                              const afterResume = Math.max(0, Math.floor((new Date() - paused) / (1000 * 60 * 60 * 24)));
                              totalDays = beforePause + afterResume;
                              return `${totalDays} days`;
                            } else if (v.status === 'active') {
                              // First active period, not paused yet
                              totalDays = Math.max(1, Math.floor((new Date() - start) / (1000 * 60 * 60 * 24)) + 1);
                              return `${totalDays} days`;
                            } else {
                              // Not started or unknown state
                              return <Badge variant="warning">Not Started</Badge>;
                            }
                          })()
                        : <Badge variant="warning">Not Started</Badge>
                    }</TableCell>
                    <TableCell>{getKycBadge(v.kycStatus || v.kyc || v.kyc_status)}</TableCell>
                    <TableCell>{getStatusBadge(v.status)}</TableCell>
                    <TableCell>{v.remarks || '-'}</TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <button title="View" className="p-1 text-gray-400 hover:text-blue-600" onClick={()=>handleViewVehicle(v)}><Eye className="h-4 w-4"/></button>
                        <PermissionGuard permission={PERMISSIONS.DRIVERS_EDIT}><button title="Edit" className="p-1 text-gray-400 hover:text-green-600" onClick={()=>handleEditVehicle(v)}><Edit className="h-4 w-4"/></button></PermissionGuard>
                        <PermissionGuard permission={PERMISSIONS.DRIVERS_EDIT}>
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
                        <PermissionGuard permission={PERMISSIONS.DRIVERS_DELETE}><button title="Delete" className="p-1 text-gray-400 hover:text-red-600" onClick={()=>handleDeleteVehicle(v)}><Trash2 className="h-4 w-4"/></button></PermissionGuard>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <VehicleModal isOpen={showVehicleModal} onClose={()=>{setShowVehicleModal(false); setSelectedVehicle(null);}} vehicle={selectedVehicle} onSave={handleSaveVehicle} />
      <VehicleDetailModal isOpen={showDetailModal} onClose={()=>setShowDetailModal(false)} vehicle={selectedVehicle} drivers={drivers} managers={managers} />
    </div>
  );
}
