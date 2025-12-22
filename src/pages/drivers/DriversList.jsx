import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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

  useEffect(() => {
    let mounted = true;
    async function fetchDrivers() {
      setLoading(true);
      setError(null);
      try {
        // Use Vite env var VITE_API_BASE to point to backend in dev/production.
        // Fallback to https://udrive-backend-1igb.vercel.app for local development.
        const API_BASE = import.meta.env.VITE_API_BASE || 'https://udrive-backend-1igb.vercel.app';
        
        // Fetch manual drivers
        const res = await fetch(`${API_BASE}/api/drivers?limit=1000`);
        if (!res.ok) throw new Error(`Failed to load drivers: ${res.status}`);
        const result = await res.json();
        const data = result.data || result;
        if (mounted) setDriversData(data);
        
        // Fetch signup credentials
        const credRes = await fetch(`${API_BASE}/api/drivers/signup/credentials?limit=1000`);
        if (credRes.ok) {
          const credResult = await credRes.json();
          const credData = credResult.data || credResult;
          if (mounted) setSignupCredentials(credData);
        }
      } catch (err) {
        console.error(err);
        setError(err.message || 'Failed to load drivers');
        toast.error('Failed to load drivers');
      } finally {
        if (mounted) setLoading(false);
      }
    }

    fetchDrivers();
    return () => { mounted = false; };
  }, []);

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

  const handleCreateDriver = () => {
    setSelectedDriver(null);
    setShowDriverModal(true);
  };

  const handleEditDriver = async (driver) => {
    try {
      // Fetch complete driver data from the backend
      const API_BASE = import.meta.env.VITE_API_BASE || 'https://udrive-backend-1igb.vercel.app';
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

  const handleSaveDriver = async (driverData) => {
    try {
      const API_BASE = import.meta.env.VITE_API_BASE || 'https://udrive-backend-1igb.vercel.app';
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
        const res = await fetch(`${API_BASE}/api/drivers`, {
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

  const handleDeleteDriver = (driverId) => {
    if (window.confirm('Are you sure you want to delete this driver?')) {
      (async () => {
        try {
          const API_BASE = import.meta.env.VITE_API_BASE || 'https://udrive-backend-1igb.vercel.app';
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
      const API_BASE = import.meta.env.VITE_API_BASE || 'https://udrive-backend-1igb.vercel.app'||'https://udrive-backend-1igb.vercel.app';
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
        const API_BASE = import.meta.env.VITE_API_BASE || 'https://udrive-backend-1igb.vercel.app';
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

  // Permissions can be referenced directly via <PermissionGuard>, so local vars are not needed

  const handleExportToCSV = () => {
    try {
      // Prepare CSV data with ALL fields from Driver model
      const headers = [
        'ID', 'Username', 'Name', 'Email', 'Phone', 'Mobile',
        'Date of Birth', 'Address', 'City', 'State', 'Pincode',
        'GPS Latitude', 'GPS Longitude',
        'Emergency Contact', 'Emergency Relation', 'Emergency Phone', 'Emergency Phone Secondary',
        'Employee ID',
        'License Number', 'License Class', 'License Expiry Date',
        'Aadhar Number', 'PAN Number', 'Electric Bill No',
        'Driving Experience', 'Previous Employment',
        'Plan Type', 'Current Plan', 'Plan Amount', 'Vehicle Preference', 'Vehicle Assigned',
        'Total Trips', 'Total Earnings', 'Rating',
        'KYC Status', 'Status',
        'Bank Name', 'Branch Name', 'Account Number', 'IFSC Code', 'Account Holder Name',
        'Profile Photo URL', 'License Document URL', 'Aadhar Front URL', 'Aadhar Back URL',
        'PAN Document URL', 'Bank Document URL', 'Electric Bill Document URL',
        'Join Date', 'Last Active', 'Created At', 'Updated At'
      ];
      
      const csvData = filteredDrivers.map(driver => [
        driver.id || driver._id || '',
        driver.username || '',
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
        driver.emergencyRelation || '',
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
        driver.totalTrips || '0',
        driver.totalEarnings || '0',
        driver.rating || '0',
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
        driver.joinDate ? formatDate(driver.joinDate) : '',
        driver.lastActive ? formatDate(driver.lastActive) : '',
        driver.createdAt ? formatDate(driver.createdAt) : '',
        driver.updatedAt ? formatDate(driver.updatedAt) : ''
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
                <Car className="h-6 w-6 text-green-600" />
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

              {/* <select
                value={planFilter}
                onChange={(e) => setPlanFilter(e.target.value)}
                className="input"
              >
                <option value="all">All Plans</option>
                <option value="Uber Rent Plan">Uber Plan</option>
                <option value="Daily Rent Plan">Daily Collection</option>
     
              </select> */}

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
                  {/* <TableHead>Vehicle</TableHead> */}
                  {/* <TableHead>Plan</TableHead> */}
                  <TableHead>KYC Status</TableHead>
                  {/* <TableHead>Status</TableHead> */}
                  {/* <TableHead>Earnings</TableHead> */}
                  {/* <TableHead>Rating</TableHead> */}
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDrivers.map((driver,index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <div>
                        <div className="font-medium text-gray-900">{driver.name}</div>
                        <div className="text-sm text-gray-500">ID: {driver.licenseNumber}</div>
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
                          <span className="text-gray-600">{driver.phone}</span>
                        </div>
                      </div>
                    </TableCell>
                    {/* <TableCell>
                      {driver.vehicleAssigned ? (
                        <div>
                          <div className="font-medium text-gray-900">{driver.vehicleAssigned}</div>
                          <div className="text-sm text-gray-500">Assigned</div>
                        </div>
                      ) : (
                        <Badge variant="warning">Not Assigned</Badge>
                      )}
                    </TableCell> */}
                    {/* <TableCell>
                      {driver.currentPlan ? (
                        <div>
                          <div className="font-medium text-gray-900">{driver.currentPlan}</div>
                          <div className="text-sm text-gray-500">{formatCurrency(driver.planAmount)}/day</div>
                        </div>
                      ) : (
                        <Badge variant="warning">No Plan</Badge>
                      )}
                    </TableCell> */}
                    <TableCell>
                      {getKycBadge(driver.kycStatus)}
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
      const API_BASE = import.meta.env.VITE_API_BASE || 'https://udrive-backend-1igb.vercel.app';
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
                            className="input text-sm h-10 leading-6 text-center"
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