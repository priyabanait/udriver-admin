import { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  IndianRupee, 
  Users, 
  PieChart, 
  Plus,
  Eye,
  Edit,
  Download,
  Search,
  Filter,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Building,
  Target,
  Clock,
  CheckCircle,
  Trash2
} from 'lucide-react';
import * as XLSX from "xlsx";
import { toast } from "react-hot-toast";
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/Table';
import { formatDate, formatCurrency } from '../../utils';
import { useAuth } from '../../contexts/AuthContext';
import { PermissionGuard } from '../../components/guards/PermissionGuards';
import { PERMISSIONS } from '../../utils/permissions';
import InvestorModal from '../../components/investors/InvestorModal';
import InvestmentDetailModal from '../../components/investors/InvestmentDetailModal';
import InvestmentPlanModal from '../../components/investors/InvestmentPlanModal';
import CarInvestmentModal from '../../components/investors/CarInvestmentModal';

// Centralized API base (falls back to local backend). Using explicit base + GET for reads for clarity.
const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';


export default function InvestmentManagement() {
  const { hasPermission } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showInvestorModal, setShowInvestorModal] = useState(false);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedInvestment, setSelectedInvestment] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [investments, setInvestments] = useState([]);
  const [investmentPlans, setInvestmentPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  // Car Investment states
  const [carInvestments, setCarInvestments] = useState([]);
  const [carInvestmentLoading, setCarInvestmentLoading] = useState(true);
  // Car Investment modal state
  const [showCarInvestmentModal, setShowCarInvestmentModal] = useState(false);
  const [selectedCarInvestment, setSelectedCarInvestment] = useState(null);
  // Investor search for each car investment
  const [investorSearchTerms, setInvestorSearchTerms] = useState({});
  const [showInvestorDropdown, setShowInvestorDropdown] = useState({});
  const [selectedInvestors, setSelectedInvestors] = useState({});
  const [savingInvestor, setSavingInvestor] = useState({});

  // Reload car investments list from database
  const reloadCarInvestments = async () => {
    try {
      setCarInvestmentLoading(true);
      const response = await fetch(`${API_BASE}/api/car-investment-entries`, { method: 'GET' });
      if (!response.ok) {
        const text = await response.text();
        console.error('Reload car investments failed', response.status, text);
        toast.error('Failed to reload car investments');
        return;
      }
      const data = await response.json();
      if (Array.isArray(data)) setCarInvestments(data);
      toast.success('Car investments reloaded');
    } catch (err) {
      console.error('Failed to reload car investments:', err);
      toast.error('Reload error');
    } finally {
      setCarInvestmentLoading(false);
    }
  };

  // Car Investment: Edit handler
  const handleEditCarInvestment = (carInv) => {
    setSelectedCarInvestment(carInv);
    setShowCarInvestmentModal(true);
  };

  // Car Investment: Delete handler
  const handleDeleteCarInvestment = async (carInvId) => {
    if (!window.confirm('Are you sure you want to delete this car investment? This action cannot be undone.')) {
      return;
    }
    try {
      const response = await fetch(`${API_BASE}/api/car-investment-entries/${carInvId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!response.ok) {
        throw new Error('Failed to delete car investment');
      }
      setCarInvestments(prev => prev.filter(inv => inv._id !== carInvId));
      toast.success('Car investment deleted successfully');
    } catch (err) {
      console.error('Failed to delete car investment:', err);
      toast.error('Failed to delete car investment');
    }
  };

  useEffect(() => {
    // Initial load using GET from database routes
    const loadData = async () => {
      try {
        setLoading(true);
        setCarInvestmentLoading(true);
        const [invRes, plansRes, carInvRes] = await Promise.all([
          fetch(`${API_BASE}/api/investors?page=1&limit=100`, { method: 'GET' }),
          fetch(`${API_BASE}/api/investment-plans`, { method: 'GET' }),
          fetch(`${API_BASE}/api/car-investment-entries?page=1&limit=100`, { method: 'GET' })
        ]);

        if (!invRes.ok) {
          const text = await invRes.text();
          console.error('Investments load failed', invRes.status, text);
          toast.error('Failed to load investments');
        } else {
          const result = await invRes.json();
          const inv = result.data || result;
          if (Array.isArray(inv)) setInvestments(inv);
        }

        if (!plansRes.ok) {
          const text = await plansRes.text();
          console.error('Plans load failed', plansRes.status, text);
          toast.error('Failed to load plans');
        } else {
          const result = await plansRes.json();
          const plans = result.data || result;
          if (Array.isArray(plans)) setInvestmentPlans(plans);
        }

        if (!carInvRes.ok) {
          const text = await carInvRes.text();
          console.error('Car Investments load failed', carInvRes.status, text);
          toast.error('Failed to load car investments');
        } else {
          const result = await carInvRes.json();
          const carInv = result.data || result;
          if (Array.isArray(carInv)) setCarInvestments(carInv);
        }
      } catch (err) {
        console.error('Failed to load investments/plans/carInvestments:', err);
        toast.error('Backend connection error');
      } finally {
        setLoading(false);
        setCarInvestmentLoading(false);
      }
    };
    loadData();
  }, []);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'active':
        return <Badge variant="success" className="flex items-center"><CheckCircle className="h-3 w-3 mr-1" />Active</Badge>;
      case 'pending':
        return <Badge variant="warning" className="flex items-center"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case 'matured':
        return <Badge variant="info" className="flex items-center"><Target className="h-3 w-3 mr-1" />Matured</Badge>;
      case 'withdrawn':
        return <Badge variant="secondary">Withdrawn</Badge>;
      default:
        return <Badge variant="info">{status}</Badge>;
    }
  };

  const getRiskBadge = (risk) => {
    switch (risk) {
      case 'low':
        return <Badge variant="success">Low Risk</Badge>;
      case 'medium':
        return <Badge variant="warning">Medium Risk</Badge>;
      case 'high':
        return <Badge variant="danger">High Risk</Badge>;
      default:
        return <Badge variant="info">{risk}</Badge>;
    }
  };

  const getKycBadge = (kycStatus) => {
    switch (kycStatus) {
      case 'verified':
        return <Badge variant="success"><CheckCircle className="h-3 w-3 mr-1" />Verified</Badge>;
      case 'pending':
        return <Badge variant="warning"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case 'rejected':
        return <Badge variant="danger">Rejected</Badge>;
      default:
        return <Badge variant="secondary">Not Verified</Badge>;
    }
  };

  const filteredInvestments = investments.filter(investment => {
    const matchesSearch = (investment.investorName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (investment.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (investment.phone || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || investment.kycStatus === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const calculateMetrics = () => {
    const totalInvestors = investments.length;
    const activeInvestors = investments.filter(inv => inv.kycStatus === 'verified').length;
    const pendingInvestors = investments.filter(inv => inv.kycStatus === 'pending').length;

    return {
      totalInvestors,
      activeInvestors,
      pendingInvestors
    };
  };

  const metrics = calculateMetrics();

  const handleAddInvestor = () => {
    setSelectedInvestment(null);
    setShowInvestorModal(true);
  };

  const handleAddPlan = () => {
    setSelectedPlan(null);
    setShowPlanModal(true);
  };

  const handleViewInvestment = (investment) => {
    setSelectedInvestment(investment);
    setShowDetailModal(true);
  };

  const handleEditInvestment = (investment) => {
    setSelectedInvestment(investment);
    setShowInvestorModal(true);
  };

  const handleInvestorSuccess = async (investmentData) => {
    try {
      console.log('handleInvestorSuccess called with:', { 
        ...investmentData, 
        profilePhoto: investmentData.profilePhoto ? 'base64 data present' : 'no photo' 
      });

      if (selectedInvestment) {
        // Update existing investment
        console.log('Updating investor ID:', selectedInvestment.id);
        const response = await fetch(`${API_BASE}/api/investors/${selectedInvestment.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(investmentData)
        });

        if (!response.ok) {
          const text = await response.text();
          console.error('Update investment failed', response.status, text);
          throw new Error('Failed to update investment');
        }

        const updatedInvestment = await response.json();
        console.log('Investor updated successfully:', updatedInvestment.id);
        setInvestments(prev => prev.map(inv => 
          inv.id === selectedInvestment.id ? updatedInvestment : inv
        ));
        toast.success('Investor updated successfully!');
      } else {
        // Add new investment to database with default kycStatus
        const dataToSend = {
          ...investmentData,
          kycStatus: investmentData.kycStatus || 'pending' // Ensure default status
        };

        console.log('Creating new investor...');
        const response = await fetch(`${API_BASE}/api/investors`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(dataToSend)
        });

        if (!response.ok) {
          const text = await response.text();
          console.error('Create investment failed', response.status, text);
          throw new Error('Failed to add investment: ' + text);
        }

        const newInvestment = await response.json();
        console.log('Investor created successfully:', newInvestment.id);
        setInvestments(prev => [...prev, newInvestment]);
        toast.success('Investor added successfully!');
      }
      setSelectedInvestment(null);
    } catch (err) {
      console.error('Failed to save investment:', err);
      toast.error('Failed to save investment: ' + err.message);
    }
  };  const handlePlanSuccess = async (planData) => {
    try {
      if (selectedPlan) {
        // Update existing plan
        const response = await fetch(`${API_BASE}/api/investment-plans/${selectedPlan.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(planData)
        });

        if (!response.ok) {
          const text = await response.text();
          console.error('Update plan failed', response.status, text);
          throw new Error('Failed to update plan');
        }

        const updatedPlan = await response.json();
        setInvestmentPlans(prev => prev.map(plan => 
          plan.id === selectedPlan.id ? updatedPlan : plan
        ));
        toast.success('Plan updated successfully!');
      } else {
        // Add new plan to database
        const response = await fetch(`${API_BASE}/api/investment-plans`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(planData)
        });

        if (!response.ok) {
          const text = await response.text();
          console.error('Create plan failed', response.status, text);
          throw new Error('Failed to add plan');
        }

        const newPlan = await response.json();
        setInvestmentPlans(prev => [...prev, newPlan]);
        toast.success('Plan added successfully!');
      }
      setSelectedPlan(null);
    } catch (err) {
      console.error('Failed to save plan:', err);
      toast.error('Failed to save plan: ' + err.message);
    }
  };

  // Reload investments list from database
  const reloadInvestments = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/investors`, { method: 'GET' });
      if (!response.ok) {
        const text = await response.text();
        console.error('Reload investments failed', response.status, text);
        toast.error('Failed to reload investments');
        return;
      }
      const data = await response.json();
      if (Array.isArray(data)) setInvestments(data);
      toast.success('Investments reloaded');
    } catch (err) {
      console.error('Failed to reload investments:', err);
      toast.error('Reload error');
    }
  };

  const handleStatusChange = async (investmentId, newStatus) => {
    try {
      const response = await fetch(`${API_BASE}/api/investors/${investmentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kycStatus: newStatus })
      });

      if (!response.ok) {
        let msg = `Failed to update KYC status: ${response.status}`;
        try {
          const body = await response.json();
          if (body && body.message) msg = body.message;
        } catch { /* ignore */ }
        throw new Error(msg);
      }

      const updatedInvestment = await response.json();
      setInvestments(prev => prev.map(inv => 
        inv.id === investmentId ? updatedInvestment : inv
      ));
      toast.success('KYC status updated successfully');
    } catch (err) {
      console.error('Failed to update KYC status:', err);
      toast.error(err.message || 'Failed to update KYC status');
    }
  };

  const handleDeleteInvestment = async (investmentId) => {
    if (!window.confirm('Are you sure you want to delete this investor? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/api/investors/${investmentId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        throw new Error('Failed to delete investor');
      }

      setInvestments(prev => prev.filter(inv => inv.id !== investmentId));
      toast.success('Investor deleted successfully');
    } catch (err) {
      console.error('Failed to delete investor:', err);
      toast.error('Failed to delete investor');
    }
  };

  const handleEditPlan = (plan) => {
    setSelectedPlan(plan);
    setShowPlanModal(true);
  };

  const handleDeletePlan = async (planId) => {
    if (!window.confirm('Are you sure you want to delete this investment plan? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/api/investment-plans/${planId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        throw new Error('Failed to delete plan');
      }

      setInvestmentPlans(prev => prev.filter(plan => plan.id !== planId));
      toast.success('Investment plan deleted successfully');
    } catch (err) {
      console.error('Failed to delete plan:', err);
      toast.error('Failed to delete investment plan');
    }
  };

  // Export currently visible (filtered) investments and a summary to CSV
const handleExportReport = () => {
  try {
    const list = filteredInvestments;

    if (!list || list.length === 0) {
      toast.error("No investments to export for the current filters.");
      return;
    }

    // 🔹 Compute summary metrics
    const computeMetrics = (arr) => {
      const totalInvestors = arr.length;
      const verifiedKYC = arr.filter(inv => inv.kycStatus === "verified").length;
      const pendingKYC = arr.filter(inv => inv.kycStatus === "pending").length;
      return { totalInvestors, verifiedKYC, pendingKYC };
    };

    const summary = computeMetrics(list);

    // 🔹 Format currency and numbers safely
    const formatCurrency = (val) => `₹${Number(val || 0).toLocaleString("en-IN")}`;

    // 🔹 Build Excel data (Array of Arrays)
    const summarySheet = [
      ["Investor Report", new Date().toLocaleString()],
      [],
      ["Metric", "Value"],
      ["Total Investors", summary.totalInvestors],
      ["Verified KYC", summary.verifiedKYC],
      ["Pending KYC", summary.pendingKYC],
      [],
      [
        "Investor Name",
        "Email",
        "Phone",
        "Address",
        "City",
        "State",
        "Aadhar Number",
        "PAN Number",
        "Bank Name",
        "Account Number",
        "IFSC Code",
        "KYC Status",
      ],
      ...list.map((inv) => [
        inv.investorName || "",
        inv.email || "",
        // 🔹 Preserve phone as text by adding a single quote prefix
        inv.phone ? `'${inv.phone}'` : "",
        inv.address || "",
        inv.city || "",
        inv.state || "",
        inv.aadharNumber || "",
        inv.panNumber || "",
        inv.bankName || "",
        inv.accountNumber || "",
        inv.ifscCode || "",
        inv.kycStatus || "pending",
      ]),
    ];

    // 🔹 Create workbook and worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(summarySheet);

    // Optional: Set column widths for better readability
    ws["!cols"] = [
      { wch: 20 }, // Investor Name
      { wch: 30 }, // Email
      { wch: 15 }, // Phone
      { wch: 30 }, // Address
      { wch: 15 }, // City
      { wch: 15 }, // State
      { wch: 15 }, // Aadhar
      { wch: 15 }, // PAN
      { wch: 20 }, // Bank Name
      { wch: 20 }, // Account Number
      { wch: 15 }, // IFSC
      { wch: 12 }, // KYC Status
    ];

    XLSX.utils.book_append_sheet(wb, ws, "Investor Report");

    // 🔹 Save file
    const date = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `investor_report_${date}.xlsx`);

    toast.success("Report exported successfully");
  } catch (err) {
    console.error("Failed to export report:", err);
    toast.error("Failed to export report");
  }
};



  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading investment data from backend...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Investment Management</h1>
          <p className="text-gray-600">Manage Amount and Car investment plans</p>
        </div>
        <div className="mt-4 sm:mt-0 flex space-x-3">
          <PermissionGuard permission={PERMISSIONS.INVESTMENTS_CREATE}>
            <button 
              onClick={handleAddPlan}
              className="btn btn-secondary flex items-center"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Amount Investment
            </button>
            <button 
              onClick={() => {
                setSelectedCarInvestment(null);
                setShowCarInvestmentModal(true);
              }}
              className="btn btn-secondary flex items-center"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Car Investment
            </button>
            
           
          </PermissionGuard>
         
          {/* <PermissionGuard permission={PERMISSIONS.REPORTS_EXPORT}>
            <button onClick={handleExportReport} className="btn btn-outline flex items-center">
              <Download className="h-4 w-4 mr-2" />
              Export Report
            </button>
          </PermissionGuard> */}
        </div>
        
      </div>

    

      {/* Investment Plans */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Building className="h-5 w-5 mr-2" />
           Amount Investment
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {investmentPlans.map(plan => (
              <div key={plan.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-3">
                  <h3 className="font-semibold text-gray-900">{plan.name}</h3>
                  {getRiskBadge(plan.riskLevel)}
                </div>
                
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Min Amount:</span>
                    <span className="font-medium">{formatCurrency(plan.minAmount)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Max Amount:</span>
                    <span className="font-medium">{formatCurrency(plan.maxAmount)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Duration:</span>
                    <span className="font-medium">{plan.duration} months</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Expected ROI:</span>
                    <span className="font-medium text-green-600">{plan.expectedROI}%</span>
                  </div>
                </div>

                <div className="mb-4">
                  <p className="text-sm text-gray-600 mb-2">Features:</p>
                  <ul className="text-xs text-gray-500 space-y-1">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-center">
                        <CheckCircle className="h-3 w-3 text-green-500 mr-1" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>

                <PermissionGuard permission={PERMISSIONS.INVESTMENTS_EDIT}>
                  <div className="flex space-x-2">
      {/* Edit Button */}
      <button
        onClick={() => handleEditPlan(plan)}
        className="flex items-center justify-center flex-1 px-3 py-1.5 text-sm font-medium text-blue-600 border border-blue-600 rounded-md hover:bg-blue-600 hover:text-white transition-colors"
      >
        <Edit className="h-4 w-4 mr-1" />
        Edit
      </button>

      {/* Delete Button */}
      <button
        onClick={() => handleDeletePlan(plan.id)}
        className="flex items-center justify-center flex-1 px-3 py-1.5 text-sm font-medium text-red-600 border border-red-600 rounded-md hover:bg-red-600 hover:text-white transition-colors"
      >
        <Trash2 className="h-4 w-4 mr-1" />
        Delete
      </button>
    </div>
                </PermissionGuard>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      {/* Car Investments Section - Card UI like Amount Investment */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Building className="h-5 w-5 mr-2" />
            Car Investments
          </CardTitle>
        </CardHeader>
        <CardContent>
          {carInvestmentLoading ? (
            <div className="text-gray-500">Loading car investments...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {carInvestments.map(carInv => (
                <div key={carInv._id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="font-semibold text-gray-900">{carInv.carname || 'Unnamed'}</h3>
                  </div>
                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Car Value:</span>
                      <span className="font-medium">{formatCurrency(carInv.carvalue || 0)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Monthly Payout:</span>
                      <span className="font-medium text-green-600">{formatCurrency(carInv.MonthlyPayout || 0)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Deduction TDS:</span>
                      <span className="font-medium">{carInv.deductionTDS || 0}%</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Final Monthly Payout:</span>
                      <span className="font-medium text-blue-600">{formatCurrency(carInv.finalMonthlyPayout || 0)}</span>
                    </div>
                    
                    {/* <div className="mt-3 pt-3 border-t border-gray-200">
                      <label className="block text-xs font-medium text-gray-600 mb-1.5">Investor:</label>
                      <div className="relative">
                        <div className="relative">
                          <input
                            type="text"
                            placeholder="Type to search investor..."
                            className="w-full text-sm border border-gray-300 rounded-md pl-9 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            value={investorSearchTerms[carInv._id] || ''}
                            onFocus={() => setShowInvestorDropdown({ ...showInvestorDropdown, [carInv._id]: true })}
                            onBlur={() => {
                              // Delay to allow click event on dropdown item to fire first
                              setTimeout(() => {
                                setShowInvestorDropdown({ ...showInvestorDropdown, [carInv._id]: false });
                              }, 200);
                            }}
                            onChange={(e) => {
                              setInvestorSearchTerms({ ...investorSearchTerms, [carInv._id]: e.target.value });
                              setShowInvestorDropdown({ ...showInvestorDropdown, [carInv._id]: true });
                            }}
                          />
                          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                        </div>
                        {showInvestorDropdown[carInv._id] && (
                          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                            {investments
                              .filter(investor => {
                                const searchTerm = (investorSearchTerms[carInv._id] || '').toLowerCase();
                                if (!searchTerm) return true;
                                return (
                                  (investor.investorName || '').toLowerCase().includes(searchTerm) ||
                                  (investor.email || '').toLowerCase().includes(searchTerm) ||
                                  (investor.phone || '').toLowerCase().includes(searchTerm)
                                );
                              })
                              .map(investor => (
                                <div
                                  key={investor.id}
                                  className="px-3 py-2 hover:bg-blue-50 cursor-pointer text-sm"
                                  onMouseDown={(e) => {
                                    // Prevent input blur before click
                                    e.preventDefault();
                                  }}
                                  onClick={() => {
                                    setSelectedInvestors({ ...selectedInvestors, [carInv._id]: investor });
                                    setInvestorSearchTerms({ ...investorSearchTerms, [carInv._id]: investor.investorName });
                                    setShowInvestorDropdown({ ...showInvestorDropdown, [carInv._id]: false });
                                  }}
                                >
                                  <div className="font-medium text-gray-900">{investor.investorName}</div>
                                  <div className="text-xs text-gray-500">
                                    {investor.phone && <span>{investor.phone}</span>}
                                    {investor.email && <span className="ml-2">({investor.email})</span>}
                                  </div>
                                </div>
                              ))}
                          </div>
                        )}
                      </div>
                      {selectedInvestors[carInv._id] && (
                        <button
                          onClick={async () => {
                            const investor = selectedInvestors[carInv._id];
                            setSavingInvestor({ ...savingInvestor, [carInv._id]: true });
                            try {
                              // Update car investment with investor ID
                              const updateResponse = await fetch(`${API_BASE}/api/car-investment-entries/${carInv._id}`, {
                                method: 'PUT',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ investorId: investor.id })
                              });
                              
                              if (!updateResponse.ok) {
                                throw new Error('Failed to assign investor');
                              }

                              // Add Final Monthly Payout to investor wallet
                              const walletResponse = await fetch(`${API_BASE}/api/investor-wallet`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  investorId: investor.id,
                                  amount: carInv.finalMonthlyPayout || 0,
                                  type: 'credit',
                                  description: `Monthly payout from ${carInv.carname} car investment`,
                                  date: new Date().toISOString()
                                })
                              });

                              if (!walletResponse.ok) {
                                throw new Error('Failed to add payout to wallet');
                              }

                              toast.success(`Investor assigned and ₹${(carInv.finalMonthlyPayout || 0).toLocaleString('en-IN')} added to wallet`);
                              await reloadCarInvestments();
                            } catch (err) {
                              console.error('Failed to save investor assignment:', err);
                              toast.error(err.message || 'Failed to save investor assignment');
                            } finally {
                              setSavingInvestor({ ...savingInvestor, [carInv._id]: false });
                            }
                          }}
                          disabled={savingInvestor[carInv._id]}
                          className="mt-2 w-full px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                        >
                          {savingInvestor[carInv._id] ? 'Saving...' : 'Save & Add Payout to Wallet'}
                        </button>
                      )}
                    </div> */}
                   
                    {/* <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Active:</span>
                      <span className="font-medium">{carInv.active ? 'Yes' : 'No'}</span>
                    </div> */}
                    {/* <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Status:</span>
                      <span className="font-medium">{carInv.status}</span>
                    </div> */}
                  </div>
                  <div className="mb-4">
                    <p className="text-sm text-gray-600 mb-2">Features:</p>
                    <ul className="text-xs text-gray-500 space-y-1">
                      {(carInv.features || []).map((feature, index) => (
                        <li key={index} className="flex items-center">
                          <CheckCircle className="h-3 w-3 text-green-500 mr-1" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>
                  {carInv.description && (
                    <div className="mb-2">
                      <span className="text-xs text-gray-500">Description: </span>
                      <span className="text-xs text-gray-700">{carInv.description}</span>
                    </div>
                  )}
                  {/* Actions can be added here if needed */}
                  <PermissionGuard permission={PERMISSIONS.INVESTMENTS_EDIT}>
                    <div className="flex space-x-2">
                      {/* Edit Button */}
                      <button
                        onClick={() => handleEditCarInvestment(carInv)}
                        className="flex items-center justify-center flex-1 px-3 py-1.5 text-sm font-medium text-blue-600 border border-blue-600 rounded-md hover:bg-blue-600 hover:text-white transition-colors"
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </button>

                      {/* Delete Button */}
                      <button
                        onClick={() => handleDeleteCarInvestment(carInv._id)}
                        className="flex items-center justify-center flex-1 px-3 py-1.5 text-sm font-medium text-red-600 border border-red-600 rounded-md hover:bg-red-600 hover:text-white transition-colors"
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Delete
                      </button>
                    </div>
                  </PermissionGuard>
                </div>
                
              ))}
            </div>
          )}
        </CardContent>
      </Card>


      

      {/* Investor Modal */}
      <InvestorModal
        isOpen={showInvestorModal}
        onClose={() => {
          setShowInvestorModal(false);
          setSelectedInvestment(null);
        }}
        onSuccess={handleInvestorSuccess}
        investor={selectedInvestment}
      />

      {/* Investment Detail Modal */}
      <InvestmentDetailModal
        isOpen={showDetailModal}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedInvestment(null);
        }}
        investment={selectedInvestment}
      />

      {/* Investment Plan Modal */}
      <InvestmentPlanModal
        isOpen={showPlanModal}
        onClose={() => {
          setShowPlanModal(false);
          setSelectedPlan(null);
        }}
        onSuccess={handlePlanSuccess}
        plan={selectedPlan}
      />

      {/* Car Investment Modal */}
      <CarInvestmentModal
        isOpen={showCarInvestmentModal}
        onClose={() => {
          setShowCarInvestmentModal(false);
          setSelectedCarInvestment(null);
        }}
        onSuccess={() => reloadCarInvestments()}
        carInvestment={selectedCarInvestment}
      />
    </div>
  );
}