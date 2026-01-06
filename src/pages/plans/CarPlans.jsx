import { useState, useEffect } from 'react';
import { 
  Car, 
  IndianRupee, 
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
import VehicleRentSlabModal from '../../components/plans/VehicleRentSlabModal';

export default function CarPlans() {
  const { hasPermission } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [showVehicleSlabModal, setShowVehicleSlabModal] = useState(false);
  const [showDailySlabModal, setShowDailySlabModal] = useState(false);
  const [activeTab, setActiveTab] = useState('plans');
  const [selectedVehicle, setSelectedVehicle] = useState('Wagon R');
  const [selectedDailyVehicle, setSelectedDailyVehicle] = useState('');

  const [carPlans, setCarPlans] = useState([]);
  // Keep separate lists to avoid cross-over between weekly and daily
  const [weeklyPlans, setWeeklyPlans] = useState([]);
  const [dailyPlans, setDailyPlans] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [slabType, setSlabType] = useState(null);
  // Data now fetched from backend static endpoints
  const [driverEnrollments, setDriverEnrollments] = useState([]);
  const [vehicleWeeklySlabs, setVehicleWeeklySlabs] = useState([]);
  const [vehicleDailySlabs, setVehicleDailySlabs] = useState([]);

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
    const averageCommission = carPlans.length > 0
      ? carPlans.reduce((sum, plan) => sum + plan.commissionRate, 0) / carPlans.length
      : 0;

    return {
      totalPlans,
      activePlans,
      totalDrivers,
      totalRevenue,
      averageCommission
    };
  };

  const metrics = calculateMetrics();

  const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';

  const mapApiPlanToUI = (p) => ({
    // Preserve Mongo _id separately and prefer it as plan identifier for API ops
    _id: p._id || p._doc?._id,
    // Use Mongo _id as id to avoid confusion with any legacy numeric id field
    id: (p._id || p._doc?._id || p.id),
    legacyId: p.id, // keep any legacy numeric id if present (not used for API calls)
    name: p.name || p.title || 'Untitled Plan',
    category: p.category || p.type || p.vehicleType || 'standard',
    vehicleTypes: p.vehicleTypes && p.vehicleTypes.length ? p.vehicleTypes : (p.vehicleType ? [p.vehicleType] : []),
    monthlyFee: p.monthlyFee ?? p.amount ?? 0,
    commissionRate: p.commissionRate ?? 0,
    features: p.features || [],
    restrictions: p.restrictions || [],
    benefits: p.benefits || [],
    status: p.status || 'active',
    // Dynamically count enrolled drivers for this plan
    enrolledDrivers: driverEnrollments.filter(e => String(e.planId) === String(p._id || p._doc?._id || p.id)).length,
    createdDate: p.createdDate || p.createdAt || '',
    // Rent slab fields
    securityDeposit: p.securityDeposit || 0,
    weeklyRentSlabs: p.weeklyRentSlabs || [],
    dailyRentSlabs: p.dailyRentSlabs || [],
    photo: p.photo || ''
  });

  const fetchCarPlans = async () => {
    try {
      // Fetch both weekly and daily plans separately
      const [weeklyRes, dailyRes] = await Promise.all([
        fetch(`${API_BASE}/api/weekly-rent-plans`),
        fetch(`${API_BASE}/api/daily-rent-plans`)
      ]);
      
      const weeklyData = weeklyRes.ok ? await weeklyRes.json() : [];
      const dailyData = dailyRes.ok ? await dailyRes.json() : [];
      
      // Map separately and store to avoid mixing types
      const mappedWeekly = (weeklyData || []).map(mapApiPlanToUI);
      const mappedDaily = (dailyData || []).map(mapApiPlanToUI);

      setWeeklyPlans(mappedWeekly);
      setDailyPlans(mappedDaily);

      // Also maintain a combined list for metrics and any generic views
      const combined = [...mappedWeekly, ...mappedDaily];
      setCarPlans(combined);
    } catch (err) {
      console.error('fetchCarPlans error', err);
      toast.error('Failed to load plans from server');
    }
  };

  const fetchDriverEnrollments = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/static/driver-enrollments`);
      if (!res.ok) throw new Error(`Enrollments fetch failed: ${res.status}`);
      const data = await res.json();
      setDriverEnrollments(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('fetchDriverEnrollments error', err);
      toast.error('Failed to load driver enrollments');
    }
  };

  // Fetch weekly/daily slabs for selected vehicle
  // const fetchVehicleWeeklySlabs = async (vehicleId) => {
  //   try {
  //     if (!vehicleId) return setVehicleWeeklySlabs([]);
  //     const res = await fetch(`${API_BASE}/api/vehicles/${vehicleId}/weekly-rent-slabs`);
  //     if (!res.ok) throw new Error(`Weekly slabs fetch failed: ${res.status}`);
  //     const data = await res.json();
  //     setVehicleWeeklySlabs(Array.isArray(data) ? data : []);
  //   } catch (err) {
  //     console.error('fetchVehicleWeeklySlabs error', err);
  //     toast.error('Failed to load weekly rent slabs');
  //   }
  // };

  // const fetchVehicleDailySlabs = async (vehicleId) => {
  //   try {
  //     if (!vehicleId) return setVehicleDailySlabs([]);
  //     const res = await fetch(`${API_BASE}/api/vehicles/${vehicleId}/daily-rent-slabs`);
  //     if (!res.ok) throw new Error(`Daily slabs fetch failed: ${res.status}`);
  //     const data = await res.json();
  //     setVehicleDailySlabs(Array.isArray(data) ? data : []);
  //   } catch (err) {
  //     console.error('fetchVehicleDailySlabs error', err);
  //     toast.error('Failed to load daily rent slabs');
  //   }
  // };

  useEffect(() => {
    fetchCarPlans();
    fetchDriverEnrollments();
  }, []);

  // Set first vehicles per type as default selections
  useEffect(() => {
    if (!selectedVehicle && weeklyPlans.length > 0) {
      setSelectedVehicle(weeklyPlans[0].name);
    }
  }, [weeklyPlans]);

  useEffect(() => {
    if (dailyPlans.length === 0) {
      setSelectedDailyVehicle('');
      setVehicleDailySlabs([]);
      return;
    }
    if (!selectedDailyVehicle) {
      setSelectedDailyVehicle(dailyPlans[0].name);
    }
  }, [dailyPlans]);

  // Fetch slabs when selected vehicle changes
  useEffect(() => {
    if (selectedVehicle) {
      const plan = weeklyPlans.find(p => p.name === selectedVehicle);
      if (plan && Array.isArray(plan.weeklyRentSlabs)) {
        setVehicleWeeklySlabs(plan.weeklyRentSlabs);
      } else {
        setVehicleWeeklySlabs([]);
      }
    }
  }, [selectedVehicle, weeklyPlans]);

  // Fetch daily slabs when selected daily vehicle changes
  useEffect(() => {
    if (selectedDailyVehicle) {
      const plan = dailyPlans.find(p => p.name === selectedDailyVehicle);
      if (plan && Array.isArray(plan.dailyRentSlabs)) {
        setVehicleDailySlabs(plan.dailyRentSlabs);
      } else {
        setVehicleDailySlabs([]);
      }
    }
  }, [selectedDailyVehicle, dailyPlans]);

  // vehiclePlanSlabs now loaded from backend (/api/static/vehicle-rent-slabs)

  const handlePlanToggle = (planId) => {
    // call backend to toggle status
    (async () => {
      try {
        const plan = carPlans.find(p => String(p.id) === String(planId));
        if (!plan) throw new Error('Plan not found');
        const newStatus = plan.status === 'active' ? 'inactive' : 'active';
        const token = localStorage.getItem('udriver_token') || 'mock';
        // Always use Mongo _id for API routes
        const res = await fetch(`${API_BASE}/api/car-plans/${plan._id || plan.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ status: newStatus })
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

  const handleVehicleSlabSave = async (formData) => {
    try {
      const token = localStorage.getItem('udriver_token') || 'mock';
      const plan = weeklyPlans.find(p => p.name === selectedVehicle);
      if (!plan) throw new Error('Plan not found');
      
      const res = await fetch(`${API_BASE}/api/weekly-rent-plans/${plan._id || plan.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          weeklyRentSlabs: formData.rows,
          securityDeposit: formData.securityDeposit,
          photo: formData.photo // send photo for backend update
        })
      });
      
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.message || `Failed to update: ${res.status}`);
      }
      
      await fetchCarPlans();
      setShowVehicleSlabModal(false);
      toast.success('Weekly rent plan updated successfully');
    } catch (err) {
      console.error('Vehicle slab update error', err);
      toast.error(err.message || 'Failed to update weekly rent plan');
    }
  };

  const handleDailySlabSave = async (formData) => {
    try {
      const token = localStorage.getItem('udriver_token') || 'mock';
      const plan = dailyPlans.find(p => p.name === selectedDailyVehicle);
      if (!plan) throw new Error('Plan not found');
      
      const res = await fetch(`${API_BASE}/api/daily-rent-plans/${plan._id || plan.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          dailyRentSlabs: formData.rows,
          securityDeposit: formData.securityDeposit,
          photo: formData.photo // send photo for backend update
        })
      });
      
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.message || `Failed to update: ${res.status}`);
      }
      
      await fetchCarPlans();
      setShowDailySlabModal(false);
      toast.success('Daily rent plan updated successfully');
    } catch (err) {
      console.error('Daily slab update error', err);
      toast.error(err.message || 'Failed to update daily rent plan');
    }
  };

  const handleDeletePlan = async (planName, type) => {
    if (!window.confirm(`Are you sure you want to delete ${planName} ${type} plan?`)) return;
    
    try {
      const token = localStorage.getItem('udriver_token') || 'mock';
      const plan = (type === 'weekly' ? weeklyPlans : dailyPlans).find(p => p.name === planName);
      if (!plan) throw new Error('Plan not found');
      
      const endpoint = type === 'weekly' ? '/api/weekly-rent-plans' : '/api/daily-rent-plans';
      const res = await fetch(`${API_BASE}${endpoint}/${plan._id || plan.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
      });
      
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.message || `Failed to delete: ${res.status}`);
      }
      
      await fetchCarPlans();
      // Reset selected vehicle if deleted
      if (type === 'weekly' && selectedVehicle === planName) {
        setSelectedVehicle('');
      }
      if (type === 'daily' && selectedDailyVehicle === planName) {
        setSelectedDailyVehicle('');
      }
      toast.success('Plan deleted successfully');
    } catch (err) {
      console.error('Delete plan error', err);
      toast.error(err.message || 'Failed to delete plan');
    }
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
              onClick={() => { setSelectedPlan(null); setShowPlanModal(true); setSlabType('weekly'); }}
              className="btn btn-primary flex items-center"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Uber Rent Plan
            </button>
            <button 
              onClick={() => { setSelectedPlan(null); setShowPlanModal(true); setSlabType('daily'); }}
              className="btn btn-primary flex items-center"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Daily Rent Plan
            </button>
          </PermissionGuard>
        </div>
      </div>

      {/* Plan create / edit modal */}
      <PlanModal
        isOpen={showPlanModal}
        onClose={() => { setShowPlanModal(false); setSelectedPlan(null); setSlabType(null); }}
        apiPath={slabType === 'weekly' ? '/api/weekly-rent-plans' : '/api/daily-rent-plans'}
        initial={selectedPlan}
        slabType={slabType}
        onSave={async (saved) => {
          try {
            await fetchCarPlans();
            toast.success('Plan saved');
          } catch (err) {
            console.error('onSave fetchCarPlans', err);
          }
        }}
      />

      {/* Vehicle Rent Slab Edit Modal */}
      <VehicleRentSlabModal
        isOpen={showVehicleSlabModal}
        onClose={() => setShowVehicleSlabModal(false)}
        vehicleName={selectedVehicle}
        vehicleData={{
          securityDeposit: carPlans.find(p => p.name === selectedVehicle)?.securityDeposit || 0,
          rows: vehicleWeeklySlabs
        }}
        photo={carPlans.find(p => p.name === selectedVehicle)?.photo}
        onSave={handleVehicleSlabSave}
      />

      {/* Daily Rent Slab Edit Modal */}
      <VehicleRentSlabModal
        isOpen={showDailySlabModal}
        onClose={() => setShowDailySlabModal(false)}
        vehicleName={selectedDailyVehicle}
        vehicleData={{
          securityDeposit: carPlans.find(p => p.name === selectedDailyVehicle)?.securityDeposit || 0,
          rows: vehicleDailySlabs
        }}
        photo={carPlans.find(p => p.name === selectedDailyVehicle)?.photo}
        onSave={handleDailySlabSave}
      />

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <Card>
          <CardContent className="p-2">
            <div className="flex items-start">
              {/* <div className="p-2 bg-blue-100 rounded-lg">
                <Car className="h-6 w-6 text-blue-600" />
              </div> */}
              {/* {dailyPlans.length > 0 ? (
                <div className="w-48">
                  <select
                    value={selectedDailyVehicle}
                    onChange={(e) => setSelectedDailyVehicle(e.target.value)}
                    className="input w-full"
                  >
                    {dailyPlans.map((plan) => (
                      <option key={plan.id || plan._id} value={plan.name}>{plan.name}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="text-sm text-gray-500">No daily plans available</div>
              )} */}
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

        {/* <Card>
          <CardContent className="p-2">
            <div className="flex items-start">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Users className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Enrolled Drivers</p>
                <p className="text-2xl font-bold text-purple-600">{metrics.totalDrivers}</p>
              </div>
            </div>
          </CardContent>
        </Card> */}

        <Card>
          <CardContent className="p-2">
            <div className="flex items-start">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <IndianRupee className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Monthly Revenue</p>
                <p className="text-2xl font-bold text-yellow-600">{formatCurrency(metrics.totalRevenue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* <Card>
          <CardContent className="p-2">
            <div className="flex items-start">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Star className="h-6 w-6 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Avg Commission</p>
                <p className="text-2xl font-bold text-orange-600">{metrics.averageCommission.toFixed(1)}%</p>
              </div>
            </div>
          </CardContent>
        </Card> */}
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
          {/* <button
            onClick={() => setActiveTab('enrollments')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'enrollments'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Driver Enrollments ({driverEnrollments.length})
          </button> */}
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

            {/* {activeTab === 'plans' && (
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
            )} */}

            {/* <div className="flex items-end">
              <button className="btn btn-outline w-full">
                <Filter className="h-4 w-4 mr-2" />
                Apply Filters
              </button>
            </div> */}
          </div>
        </CardContent>
      </Card>

      {/* Vehicle specific rent slabs (dynamic) */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between w-full">
            <div>
              <CardTitle className="text-lg">Uber Rent Plans</CardTitle>
              <p className="text-sm text-gray-500">Select a vehicle to view weekly rent slabs</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-48">
                <select
                  value={selectedVehicle}
                  onChange={(e) => setSelectedVehicle(e.target.value)}
                  className="input w-full"
                >
                  {weeklyPlans.map((plan) => (
                    <option key={plan.id || plan._id} value={plan.name}>{plan.name}</option>
                  ))}
                </select>
              </div>
              <PermissionGuard permission={PERMISSIONS.PLANS_EDIT}>
                <button
                  onClick={() => setShowVehicleSlabModal(true)}
                  className="btn btn-outline flex items-center"
                  disabled={!selectedVehicle}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Plan
                </button>
              </PermissionGuard>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Show plan photo if available (WEEKLY) */}
          {selectedVehicle && (() => {
            const plan = weeklyPlans.find(p => p.name === selectedVehicle);
            if (plan && plan.photo) {
              return (
                <div className="mb-4 flex items-center gap-4">
                  <img src={plan.photo} alt="Plan" className="h-32 rounded shadow border" style={{objectFit:'cover',maxWidth:'200px'}} />
                  <span className="text-gray-600">Photo</span>
                </div>
              );
            }
            return null;
          })()}
          {selectedVehicle && weeklyPlans.find(p => p.name === selectedVehicle) && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
              <span className="text-sm font-medium text-gray-700">Security Deposit: </span>
              <span className="text-lg font-bold text-green-600">
                ₹{weeklyPlans.find(p => p.name === selectedVehicle)?.securityDeposit || 0}
              </span>
            </div>
          )}
          {vehicleWeeklySlabs.length > 0 ? (
            <div className="overflow-x-auto">
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
                  {vehicleWeeklySlabs.map((r, idx) => (
                    <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-3 py-2">{r.trips}</td>
                      <td className="px-3 py-2 text-right">₹{r.rentDay}</td>
                      <td className="px-3 py-2 text-right">₹{r.weeklyRent}</td>
                      <td className="px-3 py-2 text-right">₹{r.accidentalCover || 105}</td>
                      <td className="px-3 py-2 text-right">{r.acceptanceRate || 60}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-gray-500">No weekly rent slab data available for selected vehicle.</p>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between w-full">
            <div>
              <CardTitle className="text-lg">Daily Rent Plans</CardTitle>
              <p className="text-sm text-gray-500">Select a vehicle to view daily rent slabs</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-48">
                <select
                  value={selectedDailyVehicle}
                  onChange={(e) => setSelectedDailyVehicle(e.target.value)}
                  className="input w-full"
                >
                  {dailyPlans.map((plan) => (
                    <option key={plan.id || plan._id} value={plan.name}>{plan.name}</option>
                  ))}
                </select>
              </div>
              <PermissionGuard permission={PERMISSIONS.PLANS_EDIT}>
                <button
                  onClick={() => setShowDailySlabModal(true)}
                  className="btn btn-outline flex items-center"
                  disabled={!selectedDailyVehicle}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Plan
                </button>
              </PermissionGuard>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {/* Show plan photo if available (DAILY) */}
          {selectedDailyVehicle && (() => {
            const plan = dailyPlans.find(p => p.name === selectedDailyVehicle);
            if (plan && plan.photo) {
              return (
                <div className="mb-4 flex items-center gap-4">
                  <img src={plan.photo} alt="Plan" className="h-32 rounded shadow border" style={{objectFit:'cover',maxWidth:'200px'}} />
                  <span className="text-gray-600">Photo</span>
                </div>
              );
            }
            return null;
          })()}
          {selectedDailyVehicle && dailyPlans.find(p => p.name === selectedDailyVehicle) && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
              <span className="text-sm font-medium text-gray-700">Security Deposit: </span>
              <span className="text-lg font-bold text-green-600">
                ₹{dailyPlans.find(p => p.name === selectedDailyVehicle)?.securityDeposit || 0}
              </span>
            </div>
          )}
          {vehicleDailySlabs.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse border border-slate-200 text-sm">
                <thead>
                  <tr className="bg-green-600 text-white">
                    <th className="px-3 py-2 text-left">Daily Trips</th>
                    <th className="px-3 py-2 text-right">Rent / Day</th>
                    <th className="px-3 py-2 text-right">Weekly Rent</th>
                  </tr>
                </thead>
                <tbody>
                  {vehicleDailySlabs.map((r, idx) => (
                    <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-3 py-2">{r.trips}</td>
                      <td className="px-3 py-2 text-right">₹{r.rentDay}</td>
                      <td className="px-3 py-2 text-right">₹{r.weeklyRent}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-gray-500">No daily rent slab data available for selected vehicle.</p>
          )}
        </CardContent>
      </Card>

    
      {/* {activeTab === 'plans' && (
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

       
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Vehicle Types</h4>
                  <div className="flex flex-wrap gap-2">
                    {plan.vehicleTypes.map((type, index) => (
                      <Badge key={index} variant="outline">{type}</Badge>
                    ))}
                  </div>
                </div>

       
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

               
                <div className="bg-blue-50 rounded-lg p-3">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">Enrolled Drivers</span>
                    <span className="font-medium text-blue-600">{plan.enrolledDrivers}</span>
                  </div>
                </div>

            
                <div className="flex space-x-2 pt-2">
                 
                  <PermissionGuard permission={PERMISSIONS.PLANS_EDIT}>
                    <button
  onClick={() => {
    setSelectedPlan({ ...plan }); // ensure all fields, including photo, are present
    setShowPlanModal(true);
  }}
  className="flex items-center justify-center gap-2 bg-[#10284C] hover:bg-[#1B3A73] text-white text-sm font-medium px-4 py-2 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md"
>
  <Edit className="w-4 h-4" />
  <span>Edit Plan</span>
</button>

                    <button
                      onClick={() => handlePlanToggle(plan.id)}
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
      )} */}

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