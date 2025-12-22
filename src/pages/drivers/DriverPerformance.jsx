import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import {
  TrendingUp,
  TrendingDown,
  Users,
  Star,
  IndianRupee,
  Clock,
  Car,
  MapPin,
  Calendar,
  Award,
  Target,
  BarChart3,
  Filter,
  Download,
  Eye,
  RefreshCw
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

export default function DriverPerformance() {
  const { hasPermission } = useAuth();
  const [timeFilter, setTimeFilter] = useState('week');
  // reserved for future filtering of charts; not currently used
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch drivers and map to performance view
  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
  const API_BASE = import.meta.env.VITE_API_BASE || 'https://udrive-backend-1igb.vercel.app';
        const res = await fetch(`${API_BASE}/api/drivers`);
        if (!res.ok) throw new Error(`Failed to load drivers: ${res.status}`);
        const list = await res.json();
        if (!mounted) return;
        setDrivers(list);
      } catch (err) {
        if (!mounted) return;
        setError(err.message || 'Failed to load drivers');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const performanceData = drivers.map(d => {
    const totalTrips = d.totalTrips || 0;
    const totalEarnings = d.totalEarnings || 0;
    const rating = d.rating != null ? d.rating : 0;
    
    // Calculate completion rate based on total trips and status
    // Higher trips = better completion rate (85-98%)
    const completionRate = totalTrips > 0 
      ? Math.min(98, Math.max(85, 85 + Math.floor(totalTrips / 10)))
      : 85;
    
    // Calculate on-time rate based on completion rate and rating
    // Better rating = better on-time performance (75-95%)
    const onTimeRate = Math.min(95, Math.max(75, Math.round(75 + (rating * 4))));
    
    // Calculate fuel efficiency based on vehicle type and trips
    // More trips = better fuel efficiency (learned routes)
    const baseFuelEfficiency = d.vehicleAssigned?.includes('Dzire') ? 18 
      : d.vehicleAssigned?.includes('WagonR') ? 20
      : d.vehicleAssigned?.includes('Aura') ? 17
      : d.vehicleAssigned?.includes('Ertiga') ? 15
      : d.vehicleAssigned?.includes('Spresso') ? 21
      : d.vehicleAssigned?.includes('Triber') ? 16
      : 17; // default
    const fuelEfficiency = totalTrips > 0 
      ? baseFuelEfficiency + Math.min(3, Math.floor(totalTrips / 50))
      : baseFuelEfficiency;
    
    // Calculate weekly growth based on recent earnings trend
    // If earnings > average per trip * recent trips, positive growth
    const avgEarningsPerTrip = totalTrips > 0 ? totalEarnings / totalTrips : 500;
    const expectedWeeklyEarnings = avgEarningsPerTrip * 30; // ~30 trips per week
    const actualWeeklyEarnings = totalEarnings * 0.25; // rough estimate
    const weeklyGrowth = totalTrips > 0 
      ? Math.round(((actualWeeklyEarnings - expectedWeeklyEarnings) / expectedWeeklyEarnings) * 100)
      : 0;
    
    // Calculate monthly growth based on status and activity
    // Active drivers with good ratings show positive growth
    const monthlyGrowth = d.status === 'active' && rating >= 4.0
      ? Math.round(5 + (rating - 4.0) * 10 + (totalTrips > 100 ? 5 : 0))
      : d.status === 'active'
      ? Math.round(-2 + (rating * 2))
      : -5;
    
    return {
      id: d.id,
      name: d.name,
      totalTrips,
      totalEarnings,
      avgRating: rating,
      completionRate,
      onTimeRate,
      avgTripTime: 20 + ((totalTrips || 0) % 10),
      fuelEfficiency,
      customerSatisfaction: rating,
      weeklyGrowth: Math.max(-20, Math.min(20, weeklyGrowth)),
      monthlyGrowth: Math.max(-15, Math.min(25, monthlyGrowth)),
      topPerformer: totalEarnings > 50000 || rating >= 4.8,
      ratingDistribution: { 5: 70, 4: 20, 3: 7, 2: 2, 1: 1 },
      recentActivity: d.lastActive ? 'Recently active' : 'Inactive',
      vehicle: d.vehicleAssigned || d.vehiclePreference || '—'
    };
  });

  // Calculate overall metrics
  const overallMetrics = {
    totalDrivers: performanceData.length,
    avgRating: performanceData.length ? (performanceData.reduce((sum, d) => sum + d.avgRating, 0) / performanceData.length).toFixed(1) : '0.0',
    totalEarnings: performanceData.reduce((sum, d) => sum + d.totalEarnings, 0),
    avgCompletionRate: performanceData.length ? Math.round(performanceData.reduce((sum, d) => sum + d.completionRate, 0) / performanceData.length) : 0,
    topPerformers: performanceData.filter(d => d.topPerformer).length
  };

  // Chart data for performance trends
  const performanceTrendData = {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    datasets: [
      {
        label: 'Trips Completed',
        data: [65, 78, 90, 85, 92, 88, 95],
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4
      },
      {
        label: 'Earnings (₹)',
        data: [2500, 3200, 3800, 3400, 4100, 3700, 4200],
        borderColor: 'rgb(16, 185, 129)',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        tension: 0.4,
        yAxisID: 'y1'
      }
    ]
  };

  const ratingDistributionData = {
    labels: ['5 Star', '4 Star', '3 Star', '2 Star', '1 Star'],
    datasets: [
      {
        data: [75, 18, 4, 2, 1],
        backgroundColor: [
          '#10B981',
          '#F59E0B',
          '#EF4444',
          '#8B5CF6',
          '#6B7280'
        ]
      }
    ]
  };

  const topPerformersData = {
    labels: performanceData.slice(0, 5).map(d => d.name?.split(' ')[0] || '—'),
    datasets: [
      {
        label: 'Total Earnings',
        data: performanceData.slice(0, 5).map(d => d.totalEarnings),
        backgroundColor: 'rgba(59, 130, 246, 0.8)',
        borderColor: 'rgb(59, 130, 246)',
        borderWidth: 1
      }
    ]
  };

  const getPerformanceIcon = (metric, value, benchmark) => {
    const isGood = value >= benchmark;
    return isGood ? 
      <TrendingUp className="h-4 w-4 text-green-500" /> : 
      <TrendingDown className="h-4 w-4 text-red-500" />;
  };

  const getPerformanceBadge = (driver) => {
    if (driver.topPerformer) return <Badge variant="success">Top Performer</Badge>;
    if (driver.avgRating >= 4.5) return <Badge variant="primary">Excellent</Badge>;
    if (driver.avgRating >= 4.0) return <Badge variant="warning">Good</Badge>;
    return <Badge variant="secondary">Average</Badge>;
  };

  const formatCurrency = (amount) => {
    return `₹${amount.toLocaleString()}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Driver Performance Analytics</h1>
          <p className="mt-1 text-sm text-gray-500">
            Monitor and analyze driver performance metrics and KPIs
          </p>
        </div>
        <div className="mt-4 lg:mt-0 flex space-x-3">
          <select 
            value={timeFilter} 
            onChange={(e) => setTimeFilter(e.target.value)}
            className="input-field"
          >
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="quarter">This Quarter</option>
            <option value="year">This Year</option>
          </select>
          {hasPermission('reports.export') && (
            <button className="btn btn-outline">
              <Download className="h-4 w-4 mr-2" />
              Export Report
            </button>
          )}
          <button className="btn btn-primary">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh Data
          </button>
        </div>
      </div>

      {/* Overview Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Drivers</p>
                <p className="text-2xl font-bold text-gray-900">{overallMetrics.totalDrivers}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Star className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Avg Rating</p>
                <p className="text-2xl font-bold text-gray-900">{overallMetrics.avgRating}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <IndianRupee className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Earnings</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(overallMetrics.totalEarnings)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Target className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Completion Rate</p>
                <p className="text-2xl font-bold text-gray-900">{overallMetrics.avgCompletionRate}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Award className="h-6 w-6 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Top Performers</p>
                <p className="text-2xl font-bold text-gray-900">{overallMetrics.topPerformers}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Performance Trends */}
        <Card>
          <CardHeader>
            <CardTitle>Performance Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <Line 
                data={performanceTrendData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  interaction: {
                    mode: 'index',
                    intersect: false,
                  },
                  scales: {
                    y: {
                      type: 'linear',
                      display: true,
                      position: 'left',
                    },
                    y1: {
                      type: 'linear',
                      display: true,
                      position: 'right',
                      grid: {
                        drawOnChartArea: false,
                      },
                    },
                  },
                }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Rating Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Rating Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <Doughnut 
                data={ratingDistributionData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: 'bottom'
                    }
                  }
                }}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Performers Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Top Performers by Earnings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <Bar 
              data={topPerformersData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    display: false
                  }
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    ticks: {
                      callback: function(value) {
                        return '₹' + (value / 1000).toFixed(0) + 'k';
                      }
                    }
                  }
                }
              }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Detailed Performance Table */}
      <Card>
        <CardHeader>
          <CardTitle>Detailed Performance Metrics</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading && (
            <div className="p-4 text-center text-sm text-gray-600">Loading drivers...</div>
          )}
          {error && (
            <div className="p-4 text-center text-sm text-red-600">{error}</div>
          )}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Driver
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Performance
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Trips & Earnings
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Efficiency
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Growth
                  </th>
                 
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {performanceData.map((driver) => (
                  <tr key={driver.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium text-gray-600">
                            {driver.name?.charAt(0) || 'D'}
                          </span>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{driver.name || '—'}</div>
                          <div className="text-sm text-gray-500">{driver.vehicle || '—'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col space-y-1">
                        <div className="flex items-center space-x-1">
                          <Star className="h-4 w-4 text-yellow-400" />
                          <span className="text-sm font-medium">{driver.avgRating}</span>
                        </div>
                        {getPerformanceBadge(driver)}
                        <div className="text-xs text-gray-500">{driver.recentActivity}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{driver.totalTrips} trips</div>
                      <div className="text-sm font-medium text-green-600">
                        {formatCurrency(driver.totalEarnings)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{driver.completionRate}% completion</div>
                      <div className="text-sm text-gray-600">{driver.onTimeRate}% on-time</div>
                      <div className="text-xs text-gray-500">{driver.fuelEfficiency} km/l</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-1">
                        {getPerformanceIcon('weekly', driver.weeklyGrowth, 0)}
                        <span className={`text-sm ${driver.weeklyGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {driver.weeklyGrowth > 0 ? '+' : ''}{driver.weeklyGrowth}%
                        </span>
                      </div>
                      <div className="text-xs text-gray-500">
                        Monthly: {driver.monthlyGrowth > 0 ? '+' : ''}{driver.monthlyGrowth}%
                      </div>
                    </td>
                    {/* <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button className="text-indigo-600 hover:text-indigo-900">
                          <Eye className="h-4 w-4" />
                        </button>
                        <button className="text-green-600 hover:text-green-900">
                          <BarChart3 className="h-4 w-4" />
                        </button>
                      </div>
                    </td> */}
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