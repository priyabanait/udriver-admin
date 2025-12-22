import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import {
  Search,
  Filter,
  ToggleLeft,
  ToggleRight,
  User,
  Phone,
  MapPin,
  Calendar,
  AlertCircle,
  CheckCircle,
  Clock,
  Eye,
  Edit,
  Download
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { PermissionGuard } from '../../components/guards/PermissionGuards';
import { PERMISSIONS } from '../../utils/permissions';
import toast from 'react-hot-toast';

export default function DriverStatus() {
  const { hasPermission } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedDrivers, setSelectedDrivers] = useState(new Set());
  const [driversData, setDriversData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
  const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';
        const res = await fetch(`${API_BASE}/api/drivers`);
        if (!res.ok) throw new Error(`Failed to load drivers: ${res.status}`);
        const list = await res.json();
        if (mounted) setDriversData(list);
      } catch (err) {
        setError(err.message || 'Failed to load drivers');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // Filter drivers based on search and status
  const filteredDrivers = driversData.filter(driver => {
    const matchesSearch = driver.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         driver.phone.includes(searchTerm) ||
                         driver.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || driver.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Get status counts
  const statusCounts = {
    all: driversData.length,
    active: driversData.filter(d => d.status === 'active').length,
    inactive: driversData.filter(d => d.status === 'inactive').length,
    suspended: driversData.filter(d => d.status === 'suspended').length
  };

  const handleStatusToggle = (driverId, currentStatus) => {
    if (!hasPermission('drivers.edit')) return;
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';

    (async () => {
      try {
        const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';
        const token = localStorage.getItem('udriver_token') || 'mock';
        const res = await fetch(`${API_BASE}/api/drivers/${driverId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ status: newStatus })
        });
        if (!res.ok) throw new Error(`Failed to update: ${res.status}`);
        const updated = await res.json();
        setDriversData(prev => prev.map(d => d.id === driverId ? updated : d));
        toast.success('Driver status updated');
      } catch (err) {
        console.error('Status update failed', err);
        toast.error(err.message || 'Failed to update status');
      }
    })();
  };

  const handleChangeDriverStatus = async (driverId, newStatus) => {
    try {
      const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';
      const token = localStorage.getItem('udriver_token') || 'mock';
      const res = await fetch(`${API_BASE}/api/drivers/${driverId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      if (!res.ok) {
        let msg = `Failed to update status: ${res.status}`;
        try { const body = await res.json(); if (body?.message) msg = body.message; } catch {}
        throw new Error(msg);
      }
      const updated = await res.json();
      setDriversData(prev => prev.map(d => d.id === driverId ? updated : d));
      toast.success('Driver status updated');
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Failed to update status');
    }
  };

  const handleBulkStatusUpdate = (newStatus) => {
    if (!hasPermission('drivers.edit') || selectedDrivers.size === 0) return;
    const ids = Array.from(selectedDrivers);
    const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';
    const token = localStorage.getItem('udriver_token') || 'mock';

    (async () => {
      try {
        const responses = await Promise.all(ids.map((id) => fetch(`${API_BASE}/api/drivers/${id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ status: newStatus })
        })));
        const updatedList = await Promise.all(responses.map(r => r.ok ? r.json() : null));
        setDriversData(prev => prev.map(d => {
          const updated = updatedList.find(u => u && u.id === d.id);
          return updated ? updated : d;
        }));
      } catch (err) {
        console.error('Bulk status update failed', err);
      } finally {
        setSelectedDrivers(new Set());
      }
    })();
  };

  const toggleDriverSelection = (driverId) => {
    const newSelection = new Set(selectedDrivers);
    if (newSelection.has(driverId)) {
      newSelection.delete(driverId);
    } else {
      newSelection.add(driverId);
    }
    setSelectedDrivers(newSelection);
  };

  const selectAllDrivers = () => {
    const allDriverIds = new Set(filteredDrivers.map(d => d.id));
    setSelectedDrivers(selectedDrivers.size === filteredDrivers.length ? new Set() : allDriverIds);
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'inactive':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'suspended':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status) => {
    if (status === 'active') return <Badge variant="success">Active</Badge>;
    if (status === 'inactive') return <Badge variant="warning">Inactive</Badge>;
    // Treat any other/legacy status (e.g., 'pending') as Suspended
    return <Badge variant="warning">Suspended</Badge>;
  };

  const formatLastActive = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Driver Status Management</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage driver active/inactive status and monitor their availability
          </p>
        </div>
        {hasPermission('drivers.export') && (
          <button className="mt-4 lg:mt-0 btn btn-outline">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </button>
        )}
      </div>

      {/* Status Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <User className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Drivers</p>
                <p className="text-2xl font-bold text-gray-900">{statusCounts.all}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Active Drivers</p>
                <p className="text-2xl font-bold text-gray-900">{statusCounts.active}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Inactive Drivers</p>
                <p className="text-2xl font-bold text-gray-900">{statusCounts.inactive}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertCircle className="h-6 w-6 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Suspended</p>
                <p className="text-2xl font-bold text-gray-900">{statusCounts.suspended}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
     <Card className="shadow-sm border border-gray-200 rounded-xl">
  <CardContent className="p-6">
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">

      {/* 🔍 Search + Filter Section */}
      <div className="flex flex-1 flex-col md:flex-row items-center gap-3">
        {/* Search Input */}
        <div className="relative w-full md:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search drivers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#10284C] focus:border-[#10284C] outline-none transition-all"
          />
        </div>

        {/* Status Dropdown */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-full md:w-48 px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#10284C] focus:border-[#10284C] outline-none transition-all bg-white"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="suspended">Suspended</option>
        </select>
      </div>

      {/* ⚙️ Bulk Actions */}
      {selectedDrivers.size > 0 && hasPermission("drivers.edit") && (
        <div className="flex items-center flex-wrap gap-2">
          <span className="text-sm text-gray-600">
            {selectedDrivers.size} selected
          </span>

          <button
            onClick={() => handleBulkStatusUpdate("active")}
            className="px-3 py-1.5 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-all"
          >
            Activate
          </button>

          <button
            onClick={() => handleBulkStatusUpdate("inactive")}
            className="px-3 py-1.5 text-sm font-medium text-white bg-yellow-500 hover:bg-yellow-600 rounded-lg transition-all"
          >
            Deactivate
          </button>

          <button
            onClick={() => handleBulkStatusUpdate("suspended")}
            className="px-3 py-1.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-all"
          >
            Suspend
          </button>
        </div>
      )}
    </div>
  </CardContent>
</Card>


      {loading && (
        <div className="p-4 text-center text-sm text-gray-600">Loading drivers...</div>
      )}
      {error && (
        <div className="p-4 text-center text-sm text-red-600">{error}</div>
      )}

      {/* Drivers Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedDrivers.size === filteredDrivers.length && filteredDrivers.length > 0}
                      onChange={selectAllDrivers}
                      className="rounded border-gray-300"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Driver
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Active
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Performance
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredDrivers.map((driver) => (
                  <tr key={driver.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedDrivers.has(driver.id)}
                        onChange={() => toggleDriverSelection(driver.id)}
                        className="rounded border-gray-300"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium text-gray-600">
                            {driver.name.charAt(0)}
                          </span>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{driver.name}</div>
                          <div className="text-sm text-gray-500">{driver.phone}</div>
                          <div className="text-xs text-gray-400">{driver.vehicleAssigned}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(driver.status)}
                        {getStatusBadge(driver.status)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{formatLastActive(driver.lastActive)}</div>
                      <div className="text-xs text-gray-500 flex items-center">
                        <MapPin className="h-3 w-3 mr-1" />
                        {driver.location}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{driver.totalTrips} trips</div>
                      <div className="text-xs text-gray-500">⭐ {driver.rating} rating</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <PermissionGuard permission={PERMISSIONS.DRIVERS_EDIT}>
                          <select
                            value={driver.status || 'inactive'}
                            onChange={(e) => handleChangeDriverStatus(driver.id, e.target.value)}
                              className="input text-sm h-10 leading-6 text-center"
                          >
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                            <option value="suspended">Suspended</option>
                            <option value="pending">Pending</option>
                          </select>
                        </PermissionGuard>
                        {/* <button className="text-indigo-600 hover:text-indigo-900" title="View Details">
                          <Eye className="h-4 w-4" />
                        </button> */}
                        {/* <PermissionGuard permission={PERMISSIONS.DRIVERS_EDIT}>
                          <button className="text-yellow-600 hover:text-yellow-900" title="Edit Driver">
                            <Edit className="h-4 w-4" />
                          </button>
                        </PermissionGuard> */}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}