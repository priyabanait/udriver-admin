import { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Eye,
  Download,
  IndianRupee,
  Calendar,
  CreditCard,
  User,
  Mail,
  Phone,
  MapPin,
  TrendingUp,
  Car
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { formatDate, formatCurrency } from '../../utils';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import { PermissionGuard } from '../../components/guards/PermissionGuards';
import { PERMISSIONS } from '../../utils/permissions';
import { useAuth } from '../../contexts/AuthContext';

const API_BASE = import.meta.env.VITE_API_BASE || 'https://udrive-backend-1igb.vercel.app';

const InvestmentCar = () => {
  const { hasPermission } = useAuth();
  const [carInvestments, setCarInvestments] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [investors, setInvestors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');


  useEffect(() => {
    loadCarInvestments();
    loadVehicles();
    loadInvestors();
  }, []);

  const loadCarInvestments = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/api/car-investment-entries?limit=1000`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!response.ok) throw new Error('Failed to load car investments');
      const result = await response.json();
      // Handle both paginated response and legacy array response
      const data = result.data || result;
      console.log('Car Investments loaded:', Array.isArray(data) ? data.length : 0, data);
      setCarInvestments(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load car investments:', err);
      setCarInvestments([]);
    } finally {
      setLoading(false);
    }
  };


  const loadVehicles = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/vehicles?limit=1000`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!response.ok) throw new Error('Failed to load vehicles');
      const result = await response.json();
      // Handle both paginated response and legacy array response
      const data = result.data || result;
      console.log('Vehicles loaded:', Array.isArray(data) ? data.length : 0, data);
      setVehicles(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load vehicles:', err);
      setVehicles([]);
    }
  };
  const loadInvestors = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/investors?limit=1000`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!response.ok) throw new Error('Failed to load investors');
      const result = await response.json();
      // Handle both paginated response and legacy array response
      const data = result.data || result;
      console.log('Investors loaded:', Array.isArray(data) ? data.length : 0, 'Sample:', data[0]);
      setInvestors(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load investors:', err);
      setInvestors([]);
    }
  };

  // Update vehicle status in backend
  const updateVehicleStatus = async (id, newStatus, oldStatus) => {
    try {
      const response = await fetch(`${API_BASE}/api/vehicles/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (!response.ok) throw new Error('Failed to update status');
      
      // Show appropriate message
      if (newStatus === 'active') {
        toast.success('Vehicle activated - Month tracking started from fresh');
      } else if (newStatus === 'inactive' || newStatus === 'suspended') {
        toast.success('Vehicle deactivated - Month tracking cleared');
      } else {
        toast.success('Vehicle status updated');
      }
      
      // Refresh vehicles after update
      await loadVehicles();
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  // Match vehicles with car investment entries by car category and investor ID
  const matchedVehiclesRaw = vehicles.map(vehicle => {
    const category = (vehicle.category || vehicle.carCategory || '').toLowerCase().trim();
    const vehicleInvestorId = vehicle.investorId?._id || vehicle.investorId;
    
    // Find investor details
    const investor = investors.find(inv => 
      String(inv.id || inv._id) === String(vehicleInvestorId)
    );
    
    // Match by category from car investment entries
    const matchedInvestment = carInvestments.find(entry => {
      const entryCarname = (entry.carname || '').toLowerCase().trim();
      const categoryMatch = entryCarname === category;
      
      if (!categoryMatch) return false;
      
      // If vehicle has investor, try to match with entry's investor
      if (vehicleInvestorId) {
        // First priority: match by investorId
        if (entry.investorId) {
          const investorIdMatch = String(entry.investorId) === String(vehicleInvestorId);
          if (investorIdMatch) return true;
        }
        
        // Second priority: match by investor mobile
        if (entry.investorMobile && investor?.phone) {
          const mobileMatch = entry.investorMobile === investor.phone;
          if (mobileMatch) return true;
        }
        
        // If entry doesn't have investor info, match by category only
        if (!entry.investorId && !entry.investorMobile) return true;
      }
      
      // If vehicle doesn't have investor but entry does, don't match
      if (!vehicleInvestorId && (entry.investorId || entry.investorMobile)) {
        return false;
      }
      
      // If neither has investor info, match by category only
      return true;
    });
    
    return {
      ...vehicle,
      matchedInvestment,
      investor
    };
  }).filter(v => v.matchedInvestment);

  console.log('Matched vehicles (raw):', matchedVehiclesRaw.length, matchedVehiclesRaw);

  // Search filter: match on vehicle, brand, model, car invest name, investor name, etc.
  const search = searchTerm.toLowerCase();
  const matchedVehicles = matchedVehiclesRaw.filter(v => {
    return (
      (v.registrationNumber || '').toLowerCase().includes(search) ||
      (v.brand || v.make || '').toLowerCase().includes(search) ||
      (v.model || '').toLowerCase().includes(search) ||
      (v.matchedInvestment?.carname || '').toLowerCase().includes(search) ||
      (v.matchedInvestment?.carOwnerName || '').toLowerCase().includes(search) ||
      (v.investor?.investorName || '').toLowerCase().includes(search)
    );
  });

  // Calculate investor-wise totals from matched vehicles
  const investorTotals = {};
  
  // Calculate totals by investor from matched vehicles
  matchedVehiclesRaw.forEach(vehicle => {
    // Extract investorId from various possible locations
    let vehicleInvestorId = null;
    if (vehicle.investorId) {
      if (typeof vehicle.investorId === 'object') {
        vehicleInvestorId = vehicle.investorId._id || vehicle.investorId.id;
      } else {
        vehicleInvestorId = vehicle.investorId;
      }
    }
    
    if (vehicleInvestorId) {
      const investorId = String(vehicleInvestorId);
      
      // Find investor details from multiple sources
      const investor = vehicle.investor || 
                      vehicle.investorId?.investorName ? vehicle.investorId : null ||
                      investors.find(inv => String(inv.id || inv._id) === investorId);
      
      const payout = parseFloat(vehicle.matchedInvestment?.finalMonthlyPayout || 0);
      
      if (!investorTotals[investorId]) {
        investorTotals[investorId] = {
          investorName: investor?.investorName || investor?.name || vehicle.ownerName || 'Unknown',
          investorPhone: investor?.phone || '',
          totalPayout: 0,
          carCount: 0,
          cars: []
        };
      }
      investorTotals[investorId].totalPayout += payout;
      investorTotals[investorId].carCount += 1;
      investorTotals[investorId].cars.push({
        vehicleNumber: vehicle.registrationNumber,
        carname: vehicle.matchedInvestment?.carname,
        brand: vehicle.brand || vehicle.make,
        model: vehicle.model,
        carOwnerName: vehicle.ownerName,
        payout: payout,
        status: vehicle.status
      });
    }
  });

  // Metrics based on filtered matched vehicles
  const totalInvestment = matchedVehicles.reduce((sum, v) => sum + parseFloat(v.matchedInvestment?.carvalue || 0), 0);
  const avgMonthlyPayout = matchedVehicles.length > 0
    ? matchedVehicles.reduce((sum, v) => sum + parseFloat(v.matchedInvestment?.finalMonthlyPayout || 0), 0) / matchedVehicles.length
    : 0;
  const totalCarInvestmentPlans = [...new Set(matchedVehicles.map(v => v.matchedInvestment?.carname))].length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading investments...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Car Investment Management</h1>
          <p className="text-gray-600">Manage car-based investments and see monthly profit</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <div className="p-3 bg-blue-100 rounded-lg">
                <IndianRupee className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Investment (Min)</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalInvestment)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <div className="p-3 bg-green-100 rounded-lg">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Monthly Payout</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(Object.values(investorTotals).reduce((sum, inv) => sum + inv.totalPayout, 0))}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <div className="p-3 bg-purple-100 rounded-lg">
                <User className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Investors</p>
                <p className="text-2xl font-bold text-purple-600">{Object.keys(investorTotals).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <div className="p-3 bg-orange-100 rounded-lg">
                <Car className="h-6 w-6 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Vehicles</p>
                <p className="text-2xl font-bold text-orange-600">{matchedVehicles.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by car investment name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full border border-gray-300 rounded-md py-2 pl-10 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </CardContent>
      </Card>

      {/* Month Tracking Info */}
      {/* <Card>
        <CardContent className="p-4">
          <div className="flex items-start space-x-3">
            <div className="p-2 bg-blue-100 rounded">
              <Calendar className="h-5 w-5 text-blue-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 mb-1">Month Tracking System</h3>
              <p className="text-sm text-gray-600">
                Set vehicle status to <span className="font-semibold text-green-600">Active</span> to start month tracking from fresh. 
                Set to <span className="font-semibold text-orange-600">Inactive</span> to stop and clear tracking. 
                Months are calculated from the active start date (every 30 days = 1 month).
              </p>
            </div>
          </div>
        </CardContent>
      </Card> */}

      {/* Investor Summary - Total Payouts */}
      {/* {Object.keys(investorTotals).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Investor Summary - Total Monthly Payouts ({Object.keys(investorTotals).length} Investors)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(investorTotals)
                .sort((a, b) => b[1].totalPayout - a[1].totalPayout) // Sort by total payout descending
                .map(([investorId, total]) => (
                <div key={investorId} className="border rounded-lg p-4 bg-gradient-to-br from-blue-50 to-indigo-50 hover:shadow-lg transition-shadow">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h3 className="font-semibold text-gray-900">{total.investorName}</h3>
                      {total.investorPhone && (
                        <p className="text-xs text-gray-500">{total.investorPhone}</p>
                      )}
                    </div>
                    <Badge variant="secondary">{total.carCount} {total.carCount === 1 ? 'car' : 'cars'}</Badge>
                  </div>
                  <div className="text-2xl font-bold text-blue-600 mb-3">
                    {formatCurrency(total.totalPayout)}
                    <span className="text-sm text-gray-500 font-normal ml-1">/month</span>
                  </div>
                  <div className="border-t pt-2 space-y-1.5 max-h-48 overflow-y-auto">
                    <p className="text-xs font-semibold text-gray-700 mb-1">Vehicle Details:</p>
                    {total.cars.map((car, idx) => (
                      <div key={idx} className="text-xs bg-white rounded p-2">
                        <div className="flex justify-between items-start mb-1">
                          <div className="flex-1">
                            <span className="font-medium text-gray-900">{car.vehicleNumber}</span>
                            {car.status && (
                              <Badge variant={car.status === 'active' ? 'success' : 'warning'} className="ml-2 text-xs">
                                {car.status}
                              </Badge>
                            )}
                          </div>
                          <span className="font-semibold text-green-600">{formatCurrency(car.payout)}/mo</span>
                        </div>
                        <div className="text-gray-600">
                          {car.brand} {car.model} - {car.carname}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )} */}

      {/* Matched Vehicles with Car Investment Details */}
      <Card>
        <CardHeader>
          <CardTitle> Vehicles Matched with Car Investment Entries ({matchedVehicles.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto overflow-y-auto h-[80vh]">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="sticky top-0 z-50 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase bg-gray-50">Investor Name</th>
                  <th className="sticky top-0 z-50 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase bg-gray-50">Vehicle</th>
                  <th className="sticky top-0 z-50 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase bg-gray-50">Brand</th>
                  <th className="sticky top-0 z-50 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase bg-gray-50">Model</th>
                  <th className="sticky top-0 z-50 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase bg-gray-50">Car Invest Name</th>
                  <th className="sticky top-0 z-50 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase bg-gray-50">Car Owner Name</th>
                    <th className="sticky top-0 z-50 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase bg-gray-50">Car Submit Date</th>
                  <th className="sticky top-0 z-50 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase bg-gray-50">Car Value</th>
                  <th className="sticky top-0 z-50 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase bg-gray-50">Monthly Payout</th>
                  <th className="sticky top-0 z-50 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase bg-gray-50">Deduction TDS</th>
                  <th className="sticky top-0 z-50 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase bg-gray-50">Final Monthly Payout</th>
                  <th className="sticky top-0 z-50 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase bg-gray-50">Months</th>
                  <th className="sticky top-0 z-50 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase bg-gray-50">Action</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {(() => {
                  // Group vehicles by investor
                  const groupedByInvestor = {};
                  matchedVehicles.forEach(v => {
                    // Get investor ID
                    let vehicleInvestorId = null;
                    if (v.investorId) {
                      if (typeof v.investorId === 'object') {
                        vehicleInvestorId = v.investorId._id || v.investorId.id;
                      } else {
                        vehicleInvestorId = v.investorId;
                      }
                    }
                    
                    const investorKey = vehicleInvestorId || 'unknown';
                    
                    if (!groupedByInvestor[investorKey]) {
                      groupedByInvestor[investorKey] = [];
                    }
                    groupedByInvestor[investorKey].push(v);
                  });

                  // Render grouped rows
                  return Object.entries(groupedByInvestor).map(([investorKey, vehicles]) => {
                    const firstVehicle = vehicles[0];
                    const entry = firstVehicle.matchedInvestment;
                    
                    // Get investor name
                    let investorName = '-';
                    let vehicleInvestorId = null;
                    if (firstVehicle.investorId) {
                      if (typeof firstVehicle.investorId === 'object') {
                        vehicleInvestorId = firstVehicle.investorId._id || firstVehicle.investorId.id;
                        if (firstVehicle.investorId.investorName) {
                          investorName = firstVehicle.investorId.investorName;
                        }
                      } else {
                        vehicleInvestorId = firstVehicle.investorId;
                      }
                    }
                    
                    if (investorName === '-' && vehicleInvestorId) {
                      const foundInvestor = investors.find(inv => 
                        String(inv.id || inv._id) === String(vehicleInvestorId)
                      );
                      if (foundInvestor?.investorName) {
                        investorName = foundInvestor.investorName;
                      }
                    }
                    
                    if (investorName === '-' && firstVehicle.investor?.investorName) {
                      investorName = firstVehicle.investor.investorName;
                    }
                    
                    if (investorName === '-' && entry.investorId) {
                      const entryInvestor = investors.find(inv => 
                        String(inv.id || inv._id) === String(entry.investorId)
                      );
                      if (entryInvestor?.investorName) {
                        investorName = entryInvestor.investorName;
                      }
                    }

                    // Calculate total monthly payout for all vehicles
                    const totalMonthlyPayout = vehicles.reduce((sum, v) => {
                      const monthlyPayout = v.matchedInvestment?.finalMonthlyPayout || v.matchedInvestment?.MonthlyPayout || 0;
                      return sum + parseFloat(monthlyPayout);
                    }, 0);

                    return (
                      <tr key={investorKey} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="font-medium text-gray-900">{investorName}</div>
                          <div className="text-xs text-blue-600 mt-1 font-semibold">
                            Total: {vehicles.length} {vehicles.length === 1 ? 'car' : 'cars'}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {vehicles.map((v, idx) => (
                            <div key={idx} className={idx > 0 ? 'mt-2 pt-2 border-t border-gray-200' : ''}>
                              <span className="font-medium text-gray-900">{v.registrationNumber || '-'}</span>
                            </div>
                          ))}
                        </td>
                        <td className="px-6 py-4">
                          {vehicles.map((v, idx) => (
                            <div key={idx} className={idx > 0 ? 'mt-2 pt-2 border-t border-gray-200' : ''}>
                              {v.brand || v.make || '-'}
                            </div>
                          ))}
                        </td>
                        <td className="px-6 py-4">
                          {vehicles.map((v, idx) => (
                            <div key={idx} className={idx > 0 ? 'mt-2 pt-2 border-t border-gray-200' : ''}>
                              {v.model || '-'}
                            </div>
                          ))}
                        </td>
                        <td className="px-6 py-4">
                          {vehicles.map((v, idx) => (
                            <div key={idx} className={idx > 0 ? 'mt-2 pt-2 border-t border-gray-200' : ''}>
                              {v.matchedInvestment?.carname || '-'}
                            </div>
                          ))}
                        </td>
                        <td className="px-6 py-4">
                          {vehicles.map((v, idx) => (
                            <div key={idx} className={idx > 0 ? 'mt-2 pt-2 border-t border-gray-200' : ''}>
                              {v.ownerName || '-'}
                            </div>
                          ))}
                        </td>
                        <td className="px-6 py-4">
  {vehicles.map((v, idx) => (
    <div
      key={idx}
      className={idx > 0 ? 'mt-2 pt-2 border-t border-gray-200' : ''}
    >
      {v.emissionDate ? new Date(v.emissionDate).toLocaleDateString() : '-'}
    </div>
  ))}
</td>

                        <td className="px-6 py-4">
                          {vehicles.map((v, idx) => (
                            <div key={idx} className={idx > 0 ? 'mt-2 pt-2 border-t border-gray-200' : ''}>
                              {formatCurrency(v.matchedInvestment?.carvalue || 0)}
                            </div>
                          ))}
                        </td>
                        <td className="px-6 py-4">
                          {vehicles.map((v, idx) => (
                            <div key={idx} className={idx > 0 ? 'mt-2 pt-2 border-t border-gray-200' : ''}>
                              {formatCurrency(v.matchedInvestment?.MonthlyPayout || 0)}
                            </div>
                          ))}
                        </td>
                        <td className="px-6 py-4">
                          {vehicles.map((v, idx) => (
                            <div key={idx} className={idx > 0 ? 'mt-2 pt-2 border-t border-gray-200' : ''}>
                              {v.matchedInvestment?.deductionTDS || 0}%
                            </div>
                          ))}
                        </td>
                        <td className="px-6 py-4">
                          {(() => {
                            // Use backend-calculated values
                            let cumulativeTotalPayout = 0;
                            const vehicleCalculations = vehicles.map(v => {
                              const months = v.calculatedMonths || 0;
                              const monthlyPayout = v.matchedInvestment?.finalMonthlyPayout || v.matchedInvestment?.MonthlyPayout || 0;
                              const vehicleCumulative = v.cumulativePayout || (parseFloat(monthlyPayout) * months);
                              cumulativeTotalPayout += vehicleCumulative;
                              
                              return { v, months, monthlyPayout, vehicleCumulative };
                            });
                            
                            return (
                              <div className="space-y-2">
                                {/* Total Amount Card */}
                                <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-3 border border-green-200">
                                  <div className="text-sm font-bold text-green-700">
                                    {formatCurrency(cumulativeTotalPayout)}
                                  </div>
                                  <div className="text-xs text-green-600 font-medium mt-0.5">
                                    Total Accumulated Payout
                                  </div>
                                </div>
                                
                                {/* Breakdown for multiple vehicles */}
                                {vehicles.length > 1 && (
                                  <div className="bg-gray-50 rounded-lg p-2.5 space-y-1.5">
                                    {/* <div className="text-xs font-semibold text-gray-700 mb-1.5 flex items-center">
                                      <span className="w-2 h-2 bg-blue-500 rounded-full mr-1.5"></span>
                                      Vehicle Breakdown
                                    </div> */}
                                    {vehicleCalculations.map(({ v, months, monthlyPayout, vehicleCumulative }, idx) => (
                                      <div key={idx} className="bg-white rounded p-2 border border-gray-200">
                                        <div className="flex items-center justify-between mb-1">
                                          <span className="text-xs font-semibold text-gray-800">{v.registrationNumber}</span>
                                          <span className="text-xs font-bold text-green-700">{formatCurrency(vehicleCumulative)}</span>
                                        </div>
                                        <div className="text-xs text-gray-600 flex items-center">
                                          <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-medium">
                                            {formatCurrency(monthlyPayout)}/mo
                                          </span>
                                          <span className="mx-1.5 text-gray-400">×</span>
                                          <span className="bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded font-medium">
                                            {months} {months === 1 ? 'month' : 'months'}
                                          </span>
                                          <span className="mx-1.5 text-gray-400">=</span>
                                          <span className="text-green-700 font-semibold">
                                            {formatCurrency(vehicleCumulative)}
                                          </span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })()}
                        </td>
                        <td className="px-6 py-4">
                          {vehicles.map((v, idx) => {
                            // Use backend-calculated months
                            const months = v.calculatedMonths || 0;
                            const isActive = v.isActive || false;
                            const hasRentPeriods = v.hasRentPeriods || false;
                            
                            let showMonth = '-';
                            if (isActive && months > 0) {
                              showMonth = `Month ${months}`;
                            } else if (isActive && !hasRentPeriods) {
                              showMonth = 'Starting...';
                            } else {
                              showMonth = 'Not active';
                            }
                            
                            return (
                              <div key={idx} className={idx > 0 ? 'mt-2 pt-2 border-t border-gray-200' : ''}>
                                <span className={isActive ? 'text-green-600 font-medium' : 'text-gray-500'}>
                                  {showMonth}
                                </span>
                              </div>
                            );
                          })}
                        </td>
                        <td className="px-6 py-4">
                          {vehicles.map((v, idx) => {
                            const id = v.vehicleId || v._id;
                            const status = v.status || 'inactive';
                            return (
                              <div key={idx} className={idx > 0 ? 'mt-2 pt-2 border-t border-gray-200' : ''}>
                                <select
                                  value={status}
                                  onChange={e => updateVehicleStatus(id, e.target.value, status)}
                                  className="border rounded px-2 py-1 text-sm"
                                >
                                  <option value="active">Active</option>
                                  <option value="inactive">Inactive</option>
                                  <option value="suspended">Suspended</option>
                                </select>
                              </div>
                            );
                          })}
                        </td>
                      </tr>
                    );
                  });
                })()}
              </tbody>
            </table>
            {matchedVehicles.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-500">No vehicles matched with car investment entries</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default InvestmentCar;
