import { useState, useEffect } from 'react';
import { Users, Calendar, Car, IndianRupee, Search, Eye, Filter } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { formatDate } from '../../utils';
import toast from 'react-hot-toast';

export default function DriverPlanSelections() {
  const [selections, setSelections] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [planTypeFilter, setPlanTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [summaries, setSummaries] = useState({});

  const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';

  useEffect(() => {
    fetchSelections();
  }, []);

  // Refresh selections if vehicle updates changed selections
  useEffect(() => {
    const handler = (e) => {
      console.log('Driver selections updated (plans page) - refreshing...', e?.detail);
      fetchSelections();
    };
    window.addEventListener('driverSelectionsUpdated', handler);
    return () => window.removeEventListener('driverSelectionsUpdated', handler);
  }, []);

  const fetchSelections = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/driver-plan-selections`);
      if (res.ok) {
        const data = await res.json();
        setSelections(data);
        // Fetch daily rent summaries for selections that have started and whose vehicle is active
        const ids = data.filter(s => s.rentStartDate && s.vehicleStatus === 'active').map(s => s._id);
        if (ids.length) {
          const results = await Promise.allSettled(
            ids.map(id => fetch(`${API_BASE}/api/driver-plan-selections/${id}/rent-summary`).then(r => r.json()))
          );
          const map = {};
          results.forEach((r, i) => {
            const id = ids[i];
            if (r.status === 'fulfilled') map[id] = r.value;
          });
          setSummaries(map);
        }
      } else {
        toast.error('Failed to load plan selections');
      }
    } catch (err) {
      console.error('Fetch selections error:', err);
      toast.error('Network error');
    } finally {
      setLoading(false);
    }
  };

  const filteredSelections = selections.filter((selection) => {
    const matchesSearch =
      selection.driverUsername?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      selection.driverMobile?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      selection.planName?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesPlanType = planTypeFilter === 'all' || selection.planType === planTypeFilter;
    const matchesStatus = statusFilter === 'all' || selection.status === statusFilter;

    return matchesSearch && matchesPlanType && matchesStatus;
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'active':
        return <Badge variant="success">Active</Badge>;
      case 'completed':
        return <Badge variant="secondary">Completed</Badge>;
      case 'cancelled':
        return <Badge variant="danger">Cancelled</Badge>;
      case 'inactive':
        return <Badge variant="warning">Inactive</Badge>;
      default:
        return <Badge variant="info">{status}</Badge>;
    }
  };

  const getPlanTypeBadge = (type) => {
    switch (type) {
      case 'weekly':
        return <Badge variant="info">Weekly</Badge>;
      case 'daily':
        return <Badge variant="warning">Daily</Badge>;
      default:
        return <Badge variant="secondary">{type}</Badge>;
    }
  };

  const calculateMetrics = () => {
    const totalSelections = selections.length;
    const activeSelections = selections.filter((s) => s.status === 'active').length;
    const weeklySelections = selections.filter((s) => s.planType === 'weekly').length;
    const dailySelections = selections.filter((s) => s.planType === 'daily').length;
    const totalDeposits = selections
      .filter((s) => s.status === 'active')
      .reduce((sum, s) => sum + (s.securityDeposit || 0), 0);

    return {
      totalSelections,
      activeSelections,
      weeklySelections,
      dailySelections,
      totalDeposits,
    };
  };

  const metrics = calculateMetrics();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Driver Plan Selections</h1>
          <p className="text-gray-600">View and manage driver plan selections</p>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Selections</p>
                <p className="text-2xl font-bold text-blue-600">{metrics.totalSelections}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-start">
              <div className="p-2 bg-green-100 rounded-lg">
                <Users className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active Plans</p>
                <p className="text-2xl font-bold text-green-600">{metrics.activeSelections}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-start">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Calendar className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Weekly Plans</p>
                <p className="text-2xl font-bold text-purple-600">{metrics.weeklySelections}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-start">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Car className="h-6 w-6 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Daily Plans</p>
                <p className="text-2xl font-bold text-orange-600">{metrics.dailySelections}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-start">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <IndianRupee className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Deposits</p>
                <p className="text-2xl font-bold text-yellow-600">₹{metrics.totalDeposits.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input
                  type="text"
                  placeholder="Search drivers or plans..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full rounded-md border border-gray-300 bg-white py-2 pl-10 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Plan Type</label>
              <select
                value={planTypeFilter}
                onChange={(e) => setPlanTypeFilter(e.target.value)}
                className="input"
              >
                <option value="all">All Types</option>
                <option value="weekly">Weekly</option>
                <option value="daily">Daily</option>
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
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={() => {
                  setSearchTerm('');
                  setPlanTypeFilter('all');
                  setStatusFilter('all');
                }}
                className="btn btn-outline w-full"
              >
                <Filter className="h-4 w-4 mr-2" />
                Reset Filters
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Selections Table */}
      <Card>
        <CardHeader>
          <CardTitle>Plan Selections ({filteredSelections.length})</CardTitle>
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
                    Plan Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rent Details
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Security Deposit
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Daily Rent
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Selected Date
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
                {filteredSelections.map((selection) => (
                  <tr key={selection._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <Users className="h-5 w-5 text-blue-600" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {selection.driverUsername || 'N/A'}
                          </div>
                          <div className="text-sm text-gray-500">{selection.driverMobile}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{selection.planName}</div>
                      <div className="text-xs text-gray-500">ID: {selection.planId}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getPlanTypeBadge(selection.planType)}
                    </td>
                    <td className="px-6 py-4">
                      {selection.selectedRentSlab ? (
                        <div className="space-y-1">
                          <div className="text-sm font-medium text-gray-900">
                            {selection.selectedRentSlab.trips} Trips
                          </div>
                          <div className="text-xs text-gray-500">
                            Rent/Day: ₹{selection.selectedRentSlab.rentDay}
                          </div>
                          <div className="text-xs text-gray-500">
                            Weekly: ₹{selection.selectedRentSlab.weeklyRent}
                          </div>
                          {selection.planType === 'weekly' && (
                            <div className="text-xs text-gray-500">
                              Cover: ₹{selection.selectedRentSlab.accidentalCover || 105}
                            </div>
                          )}
                          <div className="text-xs font-semibold text-gray-900">
                            Total {selection.planType === 'weekly' ? 'Weekly' : 'Daily'} Payment: ₹
                            {(
                              (selection.planType === 'weekly'
                                ? (selection.selectedRentSlab?.weeklyRent || 0)
                                : (selection.selectedRentSlab?.rentDay || 0)
                              ) + (selection.planType === 'weekly' ? (selection.selectedRentSlab?.accidentalCover || 105) : 0)
                            ).toLocaleString('en-IN')}
                          </div>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">Not selected</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 flex items-center">
                        <IndianRupee className="h-4 w-4 mr-1" />
                        {selection.securityDeposit || 0}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {selection.rentStartDate && selection.vehicleStatus === 'active' ? (
                        <div className="text-xs text-gray-700">
                          <div>
                            Rent/Day: ₹{(summaries[selection._id]?.rentPerDay ?? selection.selectedRentSlab?.rentDay ?? 0).toLocaleString('en-IN')}
                          </div>
                          <div>
                            Days: {summaries[selection._id]?.totalDays ?? '-'} | Due: ₹{(summaries[selection._id]?.totalDue ?? 0).toLocaleString('en-IN')}
                          </div>
                          <div className="text-[10px] text-gray-500">Start: {formatDate(selection.rentStartDate)}</div>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-sm">Not started</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{formatDate(selection.selectedDate)}</div>
                      <div className="text-xs text-gray-500">
                        {new Date(selection.selectedDate).toLocaleTimeString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(selection.status)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button className="text-indigo-600 hover:text-indigo-900" title="View Details">
                        <Eye className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredSelections.length === 0 && (
              <div className="text-center py-12">
                <Users className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-500">No plan selections found</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
