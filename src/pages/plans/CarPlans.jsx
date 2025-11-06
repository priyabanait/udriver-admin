import { useState, useEffect } from 'react';
import { 
  Car, 
  DollarSign, 
  Star, 
  Users, 
  Plus,
  Eye,
  Edit,
  Trash2,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  Crown,
  Award,
  Shield,
  Zap,
  Clock,
  MapPin,
  Phone,
  Wifi
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/Table';
import { formatDate, formatCurrency } from '../../utils';
import { useAuth } from '../../contexts/AuthContext';
import { PermissionGuard } from '../../components/guards/PermissionGuards';
import { PERMISSIONS } from '../../utils/permissions';
import toast from 'react-hot-toast';
import PlanModal from '../../components/plans/PlanModal';

export default function CarPlans() {
  const { hasPermission } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [activeTab, setActiveTab] = useState('plans');
  const [selectedVehicle, setSelectedVehicle] = useState('Wagon R');

  const [carPlans, setCarPlans] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState(null);

  const [driverEnrollments, setDriverEnrollments] = useState([
    {
      id: 1,
      driverId: 'DR001',
      driverName: 'Rajesh Kumar',
      phone: '+91-9876543210',
      planId: 2,
      planName: 'Standard Plan',
      enrolledDate: '2024-08-15',
      status: 'active',
      monthlyFee: 8000,
      commissionRate: 18,
      vehicleAssigned: 'KA-05-AB-1234',
      performanceRating: 4.7,
      totalEarnings: 45000,
      lastPayment: '2024-10-15'
    },
    {
      id: 2,
      driverId: 'DR002',
      driverName: 'Priya Sharma',
      phone: '+91-9876543211',
      planId: 3,
      planName: 'Premium Plan',
      enrolledDate: '2024-09-01',
      status: 'active',
      monthlyFee: 12000,
      commissionRate: 15,
      vehicleAssigned: 'KA-05-CD-5678',
      performanceRating: 4.9,
      totalEarnings: 65000,
      lastPayment: '2024-10-20'
    },
    {
      id: 3,
      driverId: 'DR003',
      driverName: 'Amit Singh',
      phone: '+91-9876543212',
      planId: 1,
      planName: 'Economy Plan',
      enrolledDate: '2024-07-20',
      status: 'active',
      monthlyFee: 5000,
      commissionRate: 20,
      vehicleAssigned: 'KA-05-EF-9012',
      performanceRating: 4.5,
      totalEarnings: 32000,
      lastPayment: '2024-10-18'
    }
  ]);

  const getPlanIcon = (category) => {
    switch (category) {
      case 'economy':
        return <Car className="h-5 w-5 text-blue-600" />;
      case 'standard':
        return <Shield className="h-5 w-5 text-green-600" />;
      case 'premium':
        return <Award className="h-5 w-5 text-purple-600" />;
      case 'elite':
        return <Crown className="h-5 w-5 text-yellow-600" />;
      case 'trial':
        return <Clock className="h-5 w-5 text-gray-600" />;
      default:
        return <Car className="h-5 w-5 text-gray-600" />;
    }
  };

  const getPlanBadge = (category) => {
    switch (category) {
      case 'economy':
        return <Badge variant="info">Economy</Badge>;
      case 'standard':
        return <Badge variant="success">Standard</Badge>;
      case 'premium':
        return <Badge variant="warning">Premium</Badge>;
      case 'elite':
        return <Badge variant="danger">Elite</Badge>;
      case 'trial':
        return <Badge variant="secondary">Trial</Badge>;
      default:
        return <Badge variant="info">{category}</Badge>;
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'active':
        return <Badge variant="success" className="flex items-center"><CheckCircle className="h-3 w-3 mr-1" />Active</Badge>;
      case 'inactive':
        return <Badge variant="secondary" className="flex items-center"><XCircle className="h-3 w-3 mr-1" />Inactive</Badge>;
      case 'suspended':
        return <Badge variant="danger" className="flex items-center"><XCircle className="h-3 w-3 mr-1" />Suspended</Badge>;
      default:
        return <Badge variant="info">{status}</Badge>;
    }
  };

  const filteredPlans = carPlans.filter(plan => {
    const matchesSearch = plan.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         plan.vehicleTypes.some(type => type.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesCategory = categoryFilter === 'all' || plan.category === categoryFilter;
    const matchesStatus = statusFilter === 'all' || plan.status === statusFilter;
    
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const filteredEnrollments = driverEnrollments.filter(enrollment => {
    const matchesSearch = enrollment.driverName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         enrollment.driverId.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         enrollment.planName.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSearch;
  });

  const calculateMetrics = () => {
    const totalPlans = carPlans.length;
    const activePlans = carPlans.filter(p => p.status === 'active').length;
    const totalDrivers = carPlans.reduce((sum, plan) => sum + plan.enrolledDrivers, 0);
    const totalRevenue = driverEnrollments.reduce((sum, enrollment) => sum + enrollment.monthlyFee, 0);
    const averageCommission = carPlans.reduce((sum, plan) => sum + plan.commissionRate, 0) / carPlans.length;

    return {
      totalPlans,
      activePlans,
      totalDrivers,
      totalRevenue,
      averageCommission
    };
  };

  const metrics = calculateMetrics();

  const API_BASE = import.meta.env.VITE_API_BASE || 'https://udrive-backend-mcrx.vercel.app';

  const mapApiPlanToUI = (p) => ({
    id: p.id || p._id || p._doc?._id,
    name: p.name || p.title || 'Untitled Plan',
    category: p.category || p.type || p.vehicleType || 'standard',
    vehicleTypes: p.vehicleTypes && p.vehicleTypes.length ? p.vehicleTypes : (p.vehicleType ? [p.vehicleType] : []),
    monthlyFee: p.monthlyFee ?? p.amount ?? 0,
    commissionRate: p.commissionRate ?? 0,
    features: p.features || [],
    restrictions: p.restrictions || [],
    benefits: p.benefits || [],
    status: p.status || 'active',
    enrolledDrivers: p.enrolledDrivers ?? p.driversCount ?? 0,
    createdDate: p.createdDate || p.createdAt || ''
  });

  const fetchCarPlans = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/driver-plans`);
      if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`);
      const data = await res.json();
      setCarPlans((data || []).map(mapApiPlanToUI));
    } catch (err) {
      console.error('fetchCarPlans error', err);
      toast.error('Failed to load plans from server');
    }
  };

  useEffect(() => {
    fetchCarPlans();
  }, []);

  // Vehicle-specific rent slabs (from screenshots)
  const vehiclePlanSlabs = {
    'Wagon R': {
      securityDeposit: 12000,
      rows: [
        { trips: '0 - 59', rentDay: 890, weeklyRent: 6230 },
        { trips: '60', rentDay: 750, weeklyRent: 5250 },
        { trips: '75', rentDay: 650, weeklyRent: 4550 },
        { trips: '100', rentDay: 500, weeklyRent: 3500 },
        { trips: '115', rentDay: 370, weeklyRent: 2590 },
        { trips: '130', rentDay: 300, weeklyRent: 2100 }
      ]
    },
    'Spresso': {
      securityDeposit: 12000,
      rows: [
        { trips: '0 - 59', rentDay: 850, weeklyRent: 5950 },
        { trips: '60', rentDay: 700, weeklyRent: 4900 },
        { trips: '75', rentDay: 600, weeklyRent: 4200 },
        { trips: '100', rentDay: 450, weeklyRent: 3150 },
        { trips: '115', rentDay: 250, weeklyRent: 1750 },
        { trips: '130', rentDay: 100, weeklyRent: 700 }
      ]
    },
    'Sedan': {
      securityDeposit: 15000,
      rows: [
        { trips: '0 - 59', rentDay: 990, weeklyRent: 6930 },
        { trips: '60', rentDay: 890, weeklyRent: 6230 },
        { trips: '75', rentDay: 770, weeklyRent: 5390 },
        { trips: '100', rentDay: 650, weeklyRent: 4550 },
        { trips: '115', rentDay: 550, weeklyRent: 3850 },
        { trips: '130', rentDay: 400, weeklyRent: 2800 }
      ]
    },
    'EIP': {
      securityDeposit: 10000,
      rows: [
        { trips: '0 - 59', rentDay: 900, weeklyRent: 6300 },
        { trips: '60', rentDay: 750, weeklyRent: 5250 },
        { trips: '75', rentDay: 650, weeklyRent: 4550 },
        { trips: '100', rentDay: 500, weeklyRent: 3500 },
        { trips: '115', rentDay: 400, weeklyRent: 2800 },
        { trips: '130', rentDay: 300, weeklyRent: 2100 }
      ]
    },
    '2:1 Driver Rent': {
      securityDeposit: 15000,
      rows: [
        { trips: '0 - 59', rentDay: 1200, weeklyRent: 8400 },
        { trips: '60', rentDay: 1050, weeklyRent: 7350 },
        { trips: '75', rentDay: 975, weeklyRent: 6825 },
        { trips: '100', rentDay: 750, weeklyRent: 5250 },
        { trips: '115', rentDay: 550, weeklyRent: 3850 },
        { trips: '130', rentDay: 450, weeklyRent: 3150 }
      ]
    }
  };

  const handlePlanToggle = (planId) => {
    // call backend to toggle status
    (async () => {
      try {
        const plan = carPlans.find(p => String(p.id) === String(planId));
        if (!plan) throw new Error('Plan not found');
        const newStatus = plan.status === 'active' ? 'inactive' : 'active';
        const token = localStorage.getItem('udriver_token') || 'mock';
        const res = await fetch(`${API_BASE}/api/driver-plans/${plan.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ ...plan, status: newStatus })
        });
        if (!res.ok) {
          const body = await res.json().catch(() => null);
          throw new Error(body?.message || `Failed to update: ${res.status}`);
        }
        await fetchCarPlans();
        toast.success('Plan status updated successfully');
      } catch (err) {
        console.error('toggle status error', err);
        toast.error(err.message || 'Failed to update plan status');
      }
    })();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Car Category Plans</h1>
          <p className="text-gray-600">Manage driver plans and pricing tiers for different vehicle categories</p>
        </div>
        <div className="mt-4 sm:mt-0 flex space-x-3">
          <PermissionGuard permission={PERMISSIONS.PLANS_CREATE}>
            <button 
              onClick={() => { setSelectedPlan(null); setShowPlanModal(true); }}
              className="btn btn-primary flex items-center"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Plan
            </button>
          </PermissionGuard>
        </div>
      </div>

      {/* Plan create / edit modal */}
      <PlanModal
        isOpen={showPlanModal}
        onClose={() => { setShowPlanModal(false); setSelectedPlan(null); }}
      apiPath="/api/driver-plans"
      initial={selectedPlan}
      onSave={async (saved) => {
          // after backend returns saved plan, refresh the list to reflect persisted data
          try {
            await fetchCarPlans();
            toast.success('Plan saved');
          } catch (err) {
            console.error('onSave fetchCarPlans', err);
          }
        }}
      />

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Car className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Plans</p>
                <p className="text-2xl font-bold text-gray-900">{metrics.totalPlans}</p>
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
                <p className="text-sm font-medium text-gray-600">Active Plans</p>
                <p className="text-2xl font-bold text-green-600">{metrics.activePlans}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Users className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Enrolled Drivers</p>
                <p className="text-2xl font-bold text-purple-600">{metrics.totalDrivers}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <DollarSign className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Monthly Revenue</p>
                <p className="text-2xl font-bold text-yellow-600">{formatCurrency(metrics.totalRevenue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Star className="h-6 w-6 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Avg Commission</p>
                <p className="text-2xl font-bold text-orange-600">{metrics.averageCommission.toFixed(1)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('plans')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'plans'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Car Plans ({carPlans.length})
          </button>
          <button
            onClick={() => setActiveTab('enrollments')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'enrollments'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Driver Enrollments ({driverEnrollments.length})
          </button>
        </nav>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
              <div className="relative w-full max-w-md">
  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5 pointer-events-none" />
  <input
    type="text"
    placeholder={`Search ${activeTab}...`}
    value={searchTerm}
    onChange={(e) => setSearchTerm(e.target.value)}
    className="w-full rounded-md border border-gray-300 bg-white py-2 pl-10 pr-3 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
  />
</div>

            </div>

            {activeTab === 'plans' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="input"
                  >
                    <option value="all">All Categories</option>
                    <option value="economy">Economy</option>
                    <option value="standard">Standard</option>
                    <option value="premium">Premium</option>
                    <option value="elite">Elite</option>
                    <option value="trial">Trial</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="input"
                  >
                    <option value="all">All Status</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>
              </>
            )}

            {/* <div className="flex items-end">
              <button className="btn btn-outline w-full">
                <Filter className="h-4 w-4 mr-2" />
                Apply Filters
              </button>
            </div> */}
          </div>
        </CardContent>
      </Card>

      {/* Vehicle specific rent slabs (from screenshots) */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between w-full">
            <div>
              <CardTitle className="text-lg">Vehicle Rent Plans</CardTitle>
              <p className="text-sm text-gray-500">Select a vehicle to view rent slabs</p>
            </div>
            <div className="w-48">
              <select
                value={selectedVehicle}
                onChange={(e) => setSelectedVehicle(e.target.value)}
                className="input w-full"
              >
                {Object.keys(vehiclePlanSlabs).map((v) => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {vehiclePlanSlabs[selectedVehicle] ? (
            <div className="overflow-x-auto">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold">ACTIVE - {selectedVehicle}</h3>
                <div className="text-sm text-gray-600">Security Deposit - {formatCurrency(vehiclePlanSlabs[selectedVehicle].securityDeposit)}</div>
              </div>

              <table className="min-w-full border-collapse border border-slate-200 text-sm">
                <thead>
                  <tr className="bg-green-600 text-white">
                    <th className="px-3 py-2 text-left">Weekly Trips</th>
                    <th className="px-3 py-2 text-right">Rent / Day</th>
                    <th className="px-3 py-2 text-right">Weekly Rent</th>
                    <th className="px-3 py-2 text-right">Accidental Cover</th>
                    <th className="px-3 py-2 text-right">Acceptance Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {vehiclePlanSlabs[selectedVehicle].rows.map((r, idx) => (
                    <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-3 py-2">{r.trips}</td>
                      <td className="px-3 py-2 text-right">{r.rentDay}</td>
                      <td className="px-3 py-2 text-right">{r.weeklyRent}</td>
                      <td className="px-3 py-2 text-right">105</td>
                      <td className="px-3 py-2 text-right">60%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-gray-500">No slab data available for selected vehicle.</p>
          )}
        </CardContent>
      </Card>

      {/* Car Plans Tab */}
      {activeTab === 'plans' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredPlans.map(plan => (
            <Card key={plan.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-gray-100 rounded-lg">
                      {getPlanIcon(plan.category)}
                    </div>
                    <div>
                      <CardTitle className="text-lg">{plan.name}</CardTitle>
                      {getPlanBadge(plan.category)}
                    </div>
                  </div>
                  {getStatusBadge(plan.status)}
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {/* Pricing */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-600">Monthly Fee</span>
                    <span className="text-lg font-bold text-gray-900">{formatCurrency(plan.monthlyFee)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Commission Rate</span>
                    <span className="text-lg font-bold text-green-600">{plan.commissionRate}%</span>
                  </div>
                </div>

                {/* Vehicle Types */}
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Vehicle Types</h4>
                  <div className="flex flex-wrap gap-2">
                    {plan.vehicleTypes.map((type, index) => (
                      <Badge key={index} variant="outline">{type}</Badge>
                    ))}
                  </div>
                </div>

                {/* Features */}
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Key Features</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    {plan.features.slice(0, 4).map((feature, index) => (
                      <li key={index} className="flex items-center">
                        <CheckCircle className="h-3 w-3 text-green-500 mr-2 flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                    {plan.features.length > 4 && (
                      <li className="text-xs text-gray-500">+{plan.features.length - 4} more features</li>
                    )}
                  </ul>
                </div>

                {/* Stats */}
                <div className="bg-blue-50 rounded-lg p-3">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">Enrolled Drivers</span>
                    <span className="font-medium text-blue-600">{plan.enrolledDrivers}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex space-x-2 pt-2">
                  {/* <button className="btn btn-outline flex-1 text-sm">
                    <Eye className="h-3 w-3 mr-1" />
                    View Details
                  </button> */}
                  <PermissionGuard permission={PERMISSIONS.PLANS_EDIT}>
                    <button onClick={() => { setSelectedPlan(plan); setShowPlanModal(true); }} className="btn btn-primary flex-1 text-sm">
                      <Edit className="h-3 w-3 mr-1" />
                      Edit Plan
                    </button>
                    <button
                      // onClick={() => handlePlanToggle(plan.id)}
                      className={`btn ${plan.status === 'active' ? 'btn-danger' : 'btn-success'} text-sm`}
                    >
                      {plan.status === 'active' ? 'Deactivate' : 'Activate'}
                    </button>
                  </PermissionGuard>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Driver Enrollments Tab */}
      {activeTab === 'enrollments' && (
        <Card>
          <CardHeader>
            <CardTitle>Driver Plan Enrollments ({filteredEnrollments.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Driver Details
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Plan Details
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Vehicle
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Performance
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Earnings
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredEnrollments.map((enrollment) => (
                    <tr key={enrollment.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="p-2 bg-blue-100 rounded-lg">
                            <Users className="h-5 w-5 text-blue-600" />
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{enrollment.driverName}</div>
                            <div className="text-sm text-gray-500">{enrollment.driverId}</div>
                            <div className="text-sm text-gray-500">{enrollment.phone}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="space-y-1">
                          <div className="text-sm font-medium text-gray-900">{enrollment.planName}</div>
                          <div className="text-sm text-gray-500">Fee: {formatCurrency(enrollment.monthlyFee)}</div>
                          <div className="text-sm text-gray-500">Commission: {enrollment.commissionRate}%</div>
                          <div className="text-xs text-gray-400">Enrolled: {formatDate(enrollment.enrolledDate)}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {enrollment.vehicleAssigned}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Star className="h-4 w-4 text-yellow-400 mr-1" />
                          <span className="text-sm font-medium text-gray-900">{enrollment.performanceRating}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="space-y-1">
                          <div className="text-sm font-medium text-green-600">{formatCurrency(enrollment.totalEarnings)}</div>
                          <div className="text-xs text-gray-500">Last: {formatDate(enrollment.lastPayment)}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(enrollment.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            className="text-indigo-600 hover:text-indigo-900"
                            title="View Details"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <PermissionGuard permission={PERMISSIONS.PLANS_EDIT}>
                            <button
                              className="text-green-600 hover:text-green-900"
                              title="Edit Enrollment"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                          </PermissionGuard>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}