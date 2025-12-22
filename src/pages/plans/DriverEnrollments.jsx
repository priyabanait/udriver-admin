import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import {
  Search,
  Filter,
  Download,
  Plus,
  Edit,
  Trash2,
  Eye,
  RefreshCw,
  Phone,
  Mail,
  Calendar,
  CreditCard,
  TrendingUp,
  Users,
  CheckCircle,
  Clock,
  XCircle,
  DollarSign,
  Award
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { formatCurrency, formatDate } from '../../utils';
import { PERMISSIONS } from '../../utils/permissions';
import toast from 'react-hot-toast';

export default function DriverEnrollments() {
  const { hasPermission, user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [planFilter, setPlanFilter] = useState('all');
  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedEnrollment, setSelectedEnrollment] = useState(null);
  const [drivers, setDrivers] = useState([]);
  const [plans, setPlans] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    driverId: '',
    driverName: '',
    phone: '',
    planId: '',
    planName: '',
    enrolledDate: new Date().toISOString().slice(0, 10),
    status: 'active',
    monthlyFee: 0,
    commissionRate: 0,
    vehicleAssigned: '',
    performanceRating: 0,
    totalEarnings: 0,
    lastPayment: ''
  });

  // Fetch enrollments, drivers, and plans
  useEffect(() => {
    let mounted = true;
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';
        
        // Fetch enrollments
        const enrollRes = await fetch(`${API_BASE}/api/static/driver-enrollments`);
        if (!enrollRes.ok) throw new Error(`Failed to load enrollments: ${enrollRes.status}`);
        const enrollData = await enrollRes.json();
        
        // Fetch drivers for reference
        const driversRes = await fetch(`${API_BASE}/api/drivers`);
        if (!driversRes.ok) throw new Error(`Failed to load drivers: ${driversRes.status}`);
        const driversData = await driversRes.json();
        
        // Fetch driver plans for reference
        const plansRes = await fetch(`${API_BASE}/api/driver-plans`);
        if (!plansRes.ok) throw new Error(`Failed to load plans: ${plansRes.status}`);
        const plansData = await plansRes.json();
        
        if (!mounted) return;
        
        setEnrollments(enrollData);
        setDrivers(driversData);
        setPlans(plansData);
      } catch (err) {
        console.error(err);
        if (mounted) {
          setError(err.message || 'Failed to load data');
          toast.error('Failed to load driver enrollments');
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchData();
    return () => { mounted = false; };
  }, []);

  // Filter enrollments
  const filteredEnrollments = enrollments.filter(enrollment => {
    const matchesSearch = enrollment.driverName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         enrollment.driverId.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         enrollment.phone.includes(searchTerm);
    
    const matchesStatus = statusFilter === 'all' || enrollment.status === statusFilter;
    const matchesPlan = planFilter === 'all' || enrollment.planName === planFilter;
    
    return matchesSearch && matchesStatus && matchesPlan;
  });

  // Calculate summary statistics
  const summary = {
    totalEnrollments: enrollments.length,
    activeEnrollments: enrollments.filter(e => e.status === 'active').length,
    totalEarnings: enrollments.reduce((sum, e) => sum + (e.totalEarnings || 0), 0),
    totalCommission: enrollments.reduce((sum, e) => sum + ((e.totalEarnings || 0) * (e.commissionRate || 0) / 100), 0),
    averageRating: (enrollments.reduce((sum, e) => sum + (e.performanceRating || 0), 0) / enrollments.length).toFixed(1)
  };

  // Get unique plan names for filter
  const uniquePlans = [...new Set(enrollments.map(e => e.planName))];

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

  const handleRefresh = async () => {
    try {
      setLoading(true);
      setError(null);
      const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';
      
      const [enrollRes, driversRes, plansRes] = await Promise.all([
        fetch(`${API_BASE}/api/static/driver-enrollments`),
        fetch(`${API_BASE}/api/drivers`),
        fetch(`${API_BASE}/api/driver-plans`)
      ]);
      
      if (!enrollRes.ok) throw new Error('Failed to refresh enrollments');
      if (!driversRes.ok) throw new Error('Failed to refresh drivers');
      if (!plansRes.ok) throw new Error('Failed to refresh plans');
      
      const [enrollData, driversData, plansData] = await Promise.all([
        enrollRes.json(),
        driversRes.json(),
        plansRes.json()
      ]);
      
      setEnrollments(enrollData);
      setDrivers(driversData);
      setPlans(plansData);
      toast.success('Data refreshed successfully');
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to refresh data');
      toast.error('Failed to refresh data');
    } finally {
      setLoading(false);
    }
  };

  const handleSyncDrivers = async () => {
    if (!window.confirm('This will sync enrollments from your current driver database. Any manual changes to enrollments will be lost. Continue?')) {
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';
      const token = localStorage.getItem('udriver_token');
      
      const res = await fetch(`${API_BASE}/api/static/driver-enrollments/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });
      
      if (!res.ok) throw new Error('Failed to sync drivers');
      
      const result = await res.json();
      setEnrollments(result.enrollments);
      toast.success(`Successfully synced ${result.count} enrollments from driver database`);
      
      // Refresh additional data
      await handleRefresh();
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to sync drivers');
      toast.error('Failed to sync drivers');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (enrollmentId) => {
    if (window.confirm('Are you sure you want to delete this enrollment?')) {
      try {
        const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';
        const token = localStorage.getItem('udriver_token');
        
        const res = await fetch(`${API_BASE}/api/static/driver-enrollments/${enrollmentId}`, {
          method: 'DELETE',
          headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });
        
        if (!res.ok) throw new Error('Failed to delete enrollment');
        
        setEnrollments(prev => prev.filter(e => e.id !== enrollmentId));
        toast.success('Enrollment deleted successfully');
      } catch (err) {
        console.error(err);
        toast.error('Failed to delete enrollment');
      }
    }
  };

  const handleCreate = () => {
    setFormData({
      driverId: '',
      driverName: '',
      phone: '',
      planId: '',
      planName: '',
      enrolledDate: new Date().toISOString().slice(0, 10),
      status: 'active',
      monthlyFee: 0,
      commissionRate: 0,
      vehicleAssigned: '',
      performanceRating: 0,
      totalEarnings: 0,
      lastPayment: ''
    });
    setShowCreateModal(true);
  };

  const handleEdit = (enrollment) => {
    setFormData(enrollment);
    setShowCreateModal(true);
  };

  const handleSaveEnrollment = async () => {
    try {
      const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';
      const token = localStorage.getItem('udriver_token');
      
      if (formData.id) {
        // Update existing
        const res = await fetch(`${API_BASE}/api/static/driver-enrollments/${formData.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          },
          body: JSON.stringify(formData)
        });
        
        if (!res.ok) throw new Error('Failed to update enrollment');
        
        const updated = await res.json();
        setEnrollments(prev => prev.map(e => e.id === updated.id ? updated : e));
        toast.success('Enrollment updated successfully');
      } else {
        // Create new
        const res = await fetch(`${API_BASE}/api/static/driver-enrollments`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          },
          body: JSON.stringify(formData)
        });
        
        if (!res.ok) throw new Error('Failed to create enrollment');
        
        const created = await res.json();
        setEnrollments(prev => [...prev, created]);
        toast.success('Enrollment created successfully');
      }
      
      setShowCreateModal(false);
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Failed to save enrollment');
    }
  };

  const handleExport = () => {
    // Simple CSV export
    const headers = ['Driver ID', 'Driver Name', 'Phone', 'Plan', 'Status', 'Monthly Fee', 'Commission Rate', 'Total Earnings', 'Performance Rating'];
    const rows = filteredEnrollments.map(e => [
      e.driverId,
      e.driverName,
      e.phone,
      e.planName,
      e.status,
      e.monthlyFee,
      `${e.commissionRate}%`,
      e.totalEarnings,
      e.performanceRating
    ]);
    
    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `driver-enrollments-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    toast.success('Data exported successfully');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Driver Enrollments</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage driver plan enrollments and track their performance
          </p>
        </div>
        <div className="mt-4 lg:mt-0 flex space-x-3">
          {/* Hide Add/Sync for manager role */}
          {user?.role && !user.role.toLowerCase().includes('manager') && (
            <>
              {hasPermission(PERMISSIONS.PLANS_CREATE) && (
                <button 
                  onClick={handleCreate}
                  className="btn btn-primary flex items-center"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Enrollment
                </button>
              )}
              {hasPermission(PERMISSIONS.PLANS_CREATE) && (
                <button 
                  onClick={handleSyncDrivers}
                  className="btn btn-outline flex items-center"
                  disabled={loading}
                >
                  <Users className="h-4 w-4 mr-2" />
                  Sync from Drivers
                </button>
              )}
            </>
          )}
          {hasPermission(PERMISSIONS.REPORTS_EXPORT) && (
            <button 
              onClick={handleExport}
              className="btn btn-outline flex items-center"
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </button>
          )}
          <button 
            onClick={handleRefresh}
            className="btn btn-outline flex items-center"
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Enrollments</p>
                <p className="text-2xl font-bold text-gray-900">{summary.totalEnrollments}</p>
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
                <p className="text-sm font-medium text-gray-500">Active Enrollments</p>
                <p className="text-2xl font-bold text-gray-900">{summary.activeEnrollments}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <TrendingUp className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Earnings</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(summary.totalEarnings)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-orange-100 rounded-lg">
                <DollarSign className="h-6 w-6 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Commission</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(summary.totalCommission)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Award className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Avg. Rating</p>
                <p className="text-2xl font-bold text-gray-900">
                  {isNaN(summary.averageRating) ? 'N/A' : summary.averageRating}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0 md:space-x-4">
            <div className="flex flex-1 items-center space-x-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by driver name, ID, or phone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 input-field w-full"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="input-field"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="suspended">Suspended</option>
                <option value="pending">Pending</option>
              </select>

              <select
                value={planFilter}
                onChange={(e) => setPlanFilter(e.target.value)}
                className="input-field"
              >
                <option value="all">All Plans</option>
                {uniquePlans.map(plan => (
                  <option key={plan} value={plan}>{plan}</option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Enrollments Table */}
      <Card>
        <CardHeader>
          <CardTitle>Enrollments List ({filteredEnrollments.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading && (
            <div className="p-8 text-center">
              <RefreshCw className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-2" />
              <p className="text-sm text-gray-600">Loading enrollments...</p>
            </div>
          )}
          
          {error && (
            <div className="p-8 text-center">
              <XCircle className="h-8 w-8 text-red-600 mx-auto mb-2" />
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}
          
          {!loading && !error && filteredEnrollments.length === 0 && (
            <div className="p-8 text-center">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-sm text-gray-600">No enrollments found</p>
              <p className="text-xs text-gray-500 mt-1">Try adjusting your filters or search criteria</p>
            </div>
          )}
          
          {!loading && !error && filteredEnrollments.length > 0 && (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Driver
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contact
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Plan Details
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Financial
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Vehicle
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Performance
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    {/* <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th> */}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredEnrollments.map((enrollment) => (
                    <tr key={enrollment.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <span className="text-sm font-semibold text-blue-600">
                              {enrollment.driverName.charAt(0)}
                            </span>
                          </div>
                          <div className="ml-3">
                            <div className="text-sm font-medium text-gray-900">
                              {enrollment.driverName}
                            </div>
                            <div className="text-xs text-gray-500">
                              ID: {enrollment.driverId}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="space-y-1">
                          <div className="flex items-center text-xs text-gray-600">
                            <Phone className="h-3 w-3 mr-1 text-gray-400" />
                            {enrollment.phone}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {enrollment.planName}
                          </div>
                          <div className="text-xs text-gray-500">
                            Enrolled: {formatDate(enrollment.enrolledDate)}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="space-y-1">
                          <div className="text-sm font-medium text-gray-900">
                            Fee: {formatCurrency(enrollment.monthlyFee)}/mo
                          </div>
                          <div className="text-xs text-gray-500">
                            Commission Rate: {enrollment.commissionRate}%
                          </div>
                          <div className="text-xs text-blue-600 font-medium">
                            Commission: {formatCurrency((enrollment.totalEarnings * enrollment.commissionRate) / 100)}
                          </div>
                          <div className="text-xs text-green-600 font-medium">
                            Total Earned: {formatCurrency(enrollment.totalEarnings)}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {enrollment.vehicleAssigned || 'Not Assigned'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="space-y-1">
                          <div className="flex items-center">
                            <span className="text-yellow-400 mr-1">★</span>
                            <span className="text-sm font-medium text-gray-900">
                              {enrollment.performanceRating}
                            </span>
                          </div>
                          <div className="text-xs text-gray-500">
                            Last Payment: {formatDate(enrollment.lastPayment)}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(enrollment.status)}
                      </td>
                      {/* <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => {
                              setSelectedEnrollment(enrollment);
                              setShowModal(true);
                            }}
                            className="p-1 text-gray-400 hover:text-blue-600"
                            title="View Details"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          
                          {hasPermission(PERMISSIONS.PLANS_EDIT) && (
                            <button
                              onClick={() => handleEdit(enrollment)}
                              className="p-1 text-gray-400 hover:text-green-600"
                              title="Edit Enrollment"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                          )}
                          
                          {hasPermission(PERMISSIONS.PLANS_DELETE) && (
                            <button
                              onClick={() => handleDelete(enrollment.id)}
                              className="p-1 text-gray-400 hover:text-red-600"
                              title="Delete Enrollment"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td> */}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Modal */}
      {showModal && selectedEnrollment && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setShowModal(false)} />
            
            <div className="relative bg-white rounded-lg shadow-xl w-full max-w-3xl">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">
                  Enrollment Details - {selectedEnrollment.driverName}
                </h3>
              </div>
              
              <div className="p-6 space-y-6">
                {/* Driver Information */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">Driver Information</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-gray-500">Driver ID</label>
                      <p className="text-sm font-medium text-gray-900">{selectedEnrollment.driverId}</p>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">Driver Name</label>
                      <p className="text-sm font-medium text-gray-900">{selectedEnrollment.driverName}</p>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">Phone</label>
                      <p className="text-sm font-medium text-gray-900">{selectedEnrollment.phone}</p>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">Vehicle Assigned</label>
                      <p className="text-sm font-medium text-gray-900">{selectedEnrollment.vehicleAssigned}</p>
                    </div>
                  </div>
                </div>

                {/* Plan Information */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">Plan Information</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-gray-500">Plan Name</label>
                      <p className="text-sm font-medium text-gray-900">{selectedEnrollment.planName}</p>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">Enrolled Date</label>
                      <p className="text-sm font-medium text-gray-900">{formatDate(selectedEnrollment.enrolledDate)}</p>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">Monthly Fee</label>
                      <p className="text-sm font-medium text-gray-900">{formatCurrency(selectedEnrollment.monthlyFee)}</p>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">Commission Rate</label>
                      <p className="text-sm font-medium text-gray-900">{selectedEnrollment.commissionRate}%</p>
                    </div>
                  </div>
                </div>

                {/* Performance & Financial */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">Performance & Earnings</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-gray-500">Performance Rating</label>
                      <div className="flex items-center mt-1">
                        <span className="text-yellow-400 text-lg mr-1">★</span>
                        <span className="text-sm font-medium text-gray-900">{selectedEnrollment.performanceRating}</span>
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">Total Earnings</label>
                      <p className="text-sm font-medium text-green-600">{formatCurrency(selectedEnrollment.totalEarnings)}</p>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">Last Payment</label>
                      <p className="text-sm font-medium text-gray-900">{formatDate(selectedEnrollment.lastPayment)}</p>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">Status</label>
                      <div className="mt-1">{getStatusBadge(selectedEnrollment.status)}</div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
                <button
                  onClick={() => setShowModal(false)}
                  className="btn btn-secondary"
                >
                  Close
                </button>
                {hasPermission(PERMISSIONS.PLANS_EDIT) && (
                  <button
                    onClick={() => {
                      setShowModal(false);
                      handleEdit(selectedEnrollment);
                    }}
                    className="btn btn-primary"
                  >
                    Edit Enrollment
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showCreateModal && user?.role && !user.role.toLowerCase().includes('manager') && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setShowCreateModal(false)} />
            
            <div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">
                  {formData.id ? 'Edit Enrollment' : 'Create New Enrollment'}
                </h3>
              </div>
              
              <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Driver ID *</label>
                    <input
                      type="text"
                      value={formData.driverId}
                      onChange={(e) => setFormData({ ...formData, driverId: e.target.value })}
                      className="input-field w-full"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Driver Name *</label>
                    <input
                      type="text"
                      value={formData.driverName}
                      onChange={(e) => setFormData({ ...formData, driverName: e.target.value })}
                      className="input-field w-full"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone *</label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="input-field w-full"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Plan Name *</label>
                    <select
                      value={formData.planName}
                      onChange={(e) => setFormData({ ...formData, planName: e.target.value })}
                      className="input-field w-full"
                      required
                    >
                      <option value="">Select Plan</option>
                      <option value="Economy Plan">Economy Plan</option>
                      <option value="Standard Plan">Standard Plan</option>
                      <option value="Premium Plan">Premium Plan</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Monthly Fee *</label>
                    <input
                      type="number"
                      value={formData.monthlyFee}
                      onChange={(e) => setFormData({ ...formData, monthlyFee: Number(e.target.value) })}
                      className="input-field w-full"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Commission Rate (%) *</label>
                    <input
                      type="number"
                      value={formData.commissionRate}
                      onChange={(e) => setFormData({ ...formData, commissionRate: Number(e.target.value) })}
                      className="input-field w-full"
                      min="0"
                      max="100"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle Assigned</label>
                    <input
                      type="text"
                      value={formData.vehicleAssigned}
                      onChange={(e) => setFormData({ ...formData, vehicleAssigned: e.target.value })}
                      className="input-field w-full"
                      placeholder="e.g., KA-05-AB-1234"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status *</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className="input-field w-full"
                      required
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="suspended">Suspended</option>
                      <option value="pending">Pending</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Enrolled Date *</label>
                    <input
                      type="date"
                      value={formData.enrolledDate}
                      onChange={(e) => setFormData({ ...formData, enrolledDate: e.target.value })}
                      className="input-field w-full"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Performance Rating</label>
                    <input
                      type="number"
                      value={formData.performanceRating}
                      onChange={(e) => setFormData({ ...formData, performanceRating: Number(e.target.value) })}
                      className="input-field w-full"
                      min="0"
                      max="5"
                      step="0.1"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Total Earnings</label>
                    <input
                      type="number"
                      value={formData.totalEarnings}
                      onChange={(e) => setFormData({ ...formData, totalEarnings: Number(e.target.value) })}
                      className="input-field w-full"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Last Payment Date</label>
                    <input
                      type="date"
                      value={formData.lastPayment}
                      onChange={(e) => setFormData({ ...formData, lastPayment: e.target.value })}
                      className="input-field w-full"
                    />
                  </div>
                </div>
              </div>
              
              <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEnrollment}
                  className="btn btn-primary"
                  disabled={!formData.driverId || !formData.driverName || !formData.phone || !formData.planName}
                >
                  {formData.id ? 'Update' : 'Create'} Enrollment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
