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
  TrendingUp
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { formatDate, formatCurrency, computeFdMaturity } from '../../utils';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import { PermissionGuard } from '../../components/guards/PermissionGuards';
import { PERMISSIONS } from '../../utils/permissions';
import { useAuth } from '../../contexts/AuthContext';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';

const Investors = () => {
  const { hasPermission } = useAuth();
  const [investments, setInvestments] = useState([]);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [editingInvestment, setEditingInvestment] = useState(null);
  const [paymentInvestment, setPaymentInvestment] = useState(null);
  const [paymentFormData, setPaymentFormData] = useState({
    paymentAmount: '',
    paymentDate: new Date().toISOString().split('T')[0],
    paymentMode: 'Cash',
    paymentStatus: 'paid'
  });
  const [paymentSubmitting, setPaymentSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    investorName: '',
    email: '',
    phone: '',
    address: '',
    investmentDate: '',
    paymentMethod: '',
    investmentRate: '',
    investmentAmount: '',
    fdType: 'monthly',
    termMonths: '',
    termYears: '',
    status: 'active',
    paymentStatus: 'pending',
    paymentDate: '',
    paymentMode: '',
    notes: ''
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    loadInvestments();
      loadPlans();
  }, []);

  const loadInvestments = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/api/investment-fds?limit=1000`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        throw new Error('Failed to load investments');
      }

      const result = await response.json();
      const data = result.data || result;
      setInvestments(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load investments:', err);
      toast.error('Failed to load investments');
      setInvestments([]);
    } finally {
      setLoading(false);
    }
  };

  const loadPlans = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/investment-plans`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!response.ok) throw new Error('Failed to load plans');
      const result = await response.json();
      const data = result.data || result;
      setPlans(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load plans:', err);
      setPlans([]);
    }
  };

  const resetForm = () => {
    setFormData({
      investorName: '',
      email: '',
      phone: '',
      address: '',
      investmentDate: '',
      paymentMethod: '',
      investmentRate: '',
      investmentAmount: '',
      planId: '',
      fdType: 'monthly',
      termMonths: '',
      termYears: '',
      status: 'active',
      paymentStatus: 'pending',
      paymentDate: '',
      paymentMode: '',
      notes: ''
    });
    setErrors({});
    setEditingInvestment(null);
  };

  const handleOpenModal = (investment = null) => {
    if (investment) {
      setEditingInvestment(investment);
      setFormData({
        investorName: investment.investorName || '',
        email: investment.email || '',
        phone: investment.phone || '',
        address: investment.address || '',
        investmentDate: investment.investmentDate || '',
        paymentMethod: investment.paymentMethod || '',
        investmentRate: investment.investmentRate || '',
        investmentAmount: investment.investmentAmount || '',
        planId: investment.planId || '',
        fdType: investment.fdType || 'monthly',
        termMonths: investment.termMonths || '',
        termYears: investment.termYears || '',
        status: investment.status || 'active',
        paymentStatus: investment.paymentStatus || 'pending',
        paymentDate: investment.paymentDate || '',
        paymentMode: investment.paymentMode || '',
        notes: investment.notes || ''
      });
    } else {
      resetForm();
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    resetForm();
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.investorName.trim()) {
      newErrors.investorName = 'Investor name is required';
    }

    // Email is optional, but if provided, must be valid
    if (formData.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^[6-9]\d{9}$/.test(formData.phone.replace(/\D/g, ''))) {
      newErrors.phone = 'Invalid phone number';
    }

    if (!formData.address.trim()) {
      newErrors.address = 'Address is required';
    }

    if (!formData.investmentDate) {
      newErrors.investmentDate = 'Investment date is required';
    }

    if (!formData.paymentMethod) {
      newErrors.paymentMethod = 'Payment method is required';
    }

    if (!formData.investmentRate) {
      newErrors.investmentRate = 'Investment rate is required';
    } else if (isNaN(formData.investmentRate) || parseFloat(formData.investmentRate) <= 0) {
      newErrors.investmentRate = 'Invalid investment rate';
    }

    if (!formData.investmentAmount) {
      newErrors.investmentAmount = 'Investment amount is required';
    } else if (isNaN(formData.investmentAmount) || parseFloat(formData.investmentAmount) <= 0) {
      newErrors.investmentAmount = 'Invalid investment amount';
    }

    // Optional: plan selection not mandatory
    if (formData.planId && !plans.find(p => p.id === formData.planId)) {
      newErrors.planId = 'Selected plan is invalid';
    }

    if (!formData.fdType) {
      newErrors.fdType = 'FD type is required';
    }

    if (formData.fdType === 'monthly') {
      if (!formData.termMonths) {
        newErrors.termMonths = 'Term in months is required';
      } else if (isNaN(formData.termMonths) || parseInt(formData.termMonths) < 1 || parseInt(formData.termMonths) > 12) {
        newErrors.termMonths = 'Term must be between 1-12 months';
      }
    }

    if (formData.fdType === 'yearly') {
      if (!formData.termYears) {
        newErrors.termYears = 'Term in years is required';
      } else if (isNaN(formData.termYears) || parseInt(formData.termYears) < 1 || parseInt(formData.termYears) > 10) {
        newErrors.termYears = 'Term must be between 1-10 years';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error('Please fix all errors before submitting');
      return;
    }

    try {
      const url = editingInvestment 
        ? `${API_BASE}/api/investment-fds/${editingInvestment._id}`
        : `${API_BASE}/api/investment-fds`;
      
      const method = editingInvestment ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        throw new Error('Failed to save investment');
      }

      toast.success(editingInvestment ? 'Investment updated successfully' : 'Investment added successfully');
      handleCloseModal();
      loadInvestments();
    } catch (err) {
      console.error('Failed to save investment:', err);
      toast.error('Failed to save investment');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this investment?')) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/api/investment-fds/${id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Failed to delete investment');
      }

      toast.success('Investment deleted successfully');
      loadInvestments();
    } catch (err) {
      console.error('Failed to delete investment:', err);
      toast.error('Failed to delete investment');
    }
  };

  const handleOpenPaymentModal = (investment) => {
    setPaymentInvestment(investment);
    setPaymentFormData({
      paymentAmount: investment.investmentAmount || '',
      paymentDate: new Date().toISOString().split('T')[0],
      paymentMode: 'Cash',
      paymentStatus: 'paid'
    });
    setShowPaymentModal(true);
  };

  const handleClosePaymentModal = () => {
    setShowPaymentModal(false);
    setPaymentInvestment(null);
    setPaymentFormData({
      paymentAmount: '',
      paymentDate: new Date().toISOString().split('T')[0],
      paymentMode: 'Cash',
      paymentStatus: 'paid'
    });
  };

  const handleRecordPayment = async (e) => {
    e.preventDefault();

    if (!paymentFormData.paymentMode) {
      toast.error('Please select a payment mode');
      return;
    }

    if (!paymentFormData.paymentAmount || parseFloat(paymentFormData.paymentAmount) <= 0) {
      toast.error('Please enter a valid payment amount');
      return;
    }

    setPaymentSubmitting(true);
    try {
      const paymentData = {
        paymentStatus: paymentFormData.paymentStatus,
        paymentDate: paymentFormData.paymentDate,
        paymentMode: paymentFormData.paymentMode
      };

      console.log('Recording payment:', paymentData);

      const response = await fetch(`${API_BASE}/api/investment-fds/${paymentInvestment._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(paymentData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Payment error response:', errorData);
        throw new Error(errorData.error || 'Failed to record payment');
      }

      const updatedInvestment = await response.json();
      console.log('Payment recorded successfully:', updatedInvestment);

      toast.success(`Payment of ${formatCurrency(paymentFormData.paymentAmount)} recorded successfully`);
      handleClosePaymentModal();
      await loadInvestments();
    } catch (err) {
      console.error('Failed to record payment:', err);
      toast.error(err.message || 'Failed to record payment');
    } finally {
      setPaymentSubmitting(false);
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      const response = await fetch(`${API_BASE}/api/investment-fds/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });

      if (!response.ok) {
        throw new Error('Failed to update status');
      }

      toast.success('Status updated successfully');
      loadInvestments();
    } catch (err) {
      console.error('Failed to update status:', err);
      toast.error('Failed to update status');
    }
  };

  const handleExport = () => {
    try {
      const data = filteredInvestments.map(inv => ({
        'Investor Name': inv.investorName || '',
        'Email': inv.email || '',
        'Phone': inv.phone ? `'${inv.phone}'` : '',
        'Address': inv.address || '',
        'Investment Date': formatDate(inv.investmentDate),
        'Payment Method': inv.paymentMethod || '',
        'Investment Rate (%)': inv.investmentRate || '',
        'Investment Amount': inv.investmentAmount || '',
        'Plan Name': inv.planName || '',
        'FD Type': inv.fdType || '',
        'Term Months': inv.termMonths || '',
        'Term Years': inv.termYears || '',
        'Maturity Date': inv.maturityDate ? formatDate(inv.maturityDate) : '',
        'Maturity Amount': inv.maturityAmount || '',
        'Status': inv.status || '',
        'Payment Status': inv.paymentStatus || '',
        'Payment Date': inv.paymentDate ? formatDate(inv.paymentDate) : '',
        'Payment Mode': inv.paymentMode || '',
        'Notes': inv.notes || '',
        'Created At': inv.createdAt ? formatDate(inv.createdAt) : '',
        'Updated At': inv.updatedAt ? formatDate(inv.updatedAt) : ''
      }));

      const ws = XLSX.utils.json_to_sheet(data);
      
      // Set column widths for better readability
      ws['!cols'] = [
        { wch: 20 }, // Investor Name
        { wch: 30 }, // Email
        { wch: 15 }, // Phone
        { wch: 30 }, // Address
        { wch: 15 }, // Investment Date
        { wch: 15 }, // Payment Method
        { wch: 10 }, // Rate
        { wch: 15 }, // Amount
        { wch: 20 }, // Plan Name
        { wch: 10 }, // FD Type
        { wch: 10 }, // Term Months
        { wch: 10 }, // Term Years
        { wch: 15 }, // Maturity Date
        { wch: 15 }, // Maturity Amount
        { wch: 12 }, // Status
        { wch: 15 }, // Payment Status
        { wch: 15 }, // Payment Date
        { wch: 12 }, // Payment Mode
        { wch: 30 }, // Notes
        { wch: 18 }, // Created At
        { wch: 18 }  // Updated At
      ];
      
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Investment FDs');

      const date = new Date().toISOString().slice(0, 10);
      XLSX.writeFile(wb, `investment_fds_${date}.xlsx`);

      toast.success(`Exported ${filteredInvestments.length} investment FD records successfully`);
    } catch (err) {
      console.error('Export failed:', err);
      toast.error('Failed to export report');
    }
  };

  const filteredInvestments = investments.filter(inv => {
    const search = searchTerm.toLowerCase();
    return (
      inv.investorName?.toLowerCase().includes(search) ||
      inv.email?.toLowerCase().includes(search) ||
      inv.phone?.toLowerCase().includes(search)
    );
  });

  const totalInvestment = investments.reduce((sum, inv) => sum + parseFloat(inv.investmentAmount || 0), 0);
  const avgRate = investments.length > 0 
    ? investments.reduce((sum, inv) => sum + parseFloat(inv.investmentRate || 0), 0) / investments.length 
    : 0;

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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Investment FD Management</h1>
          <p className="text-gray-600">Manage fixed deposit investments</p>
        </div>
        <div className="mt-4 sm:mt-0 flex space-x-3">
          <PermissionGuard permission={PERMISSIONS.INVESTMENTS_CREATE}>
            <button 
              onClick={() => handleOpenModal()}
              className="btn btn-primary flex items-center"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Investment
            </button>
          </PermissionGuard>
          <PermissionGuard permission={PERMISSIONS.REPORTS_EXPORT}>
            <button 
              onClick={handleExport}
              className="btn btn-outline flex items-center"
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </button>
          </PermissionGuard>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <div className="p-3 bg-blue-100 rounded-lg">
                <IndianRupee className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Investment</p>
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
                <p className="text-sm font-medium text-gray-600">Average Rate</p>
                <p className="text-2xl font-bold text-green-600">{avgRate.toFixed(2)}%</p>
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
                <p className="text-2xl font-bold text-purple-600">{investments.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, email, or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full border border-gray-300 rounded-md py-2 pl-10 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Investors FD Records ({filteredInvestments.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-400px)]">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="sticky top-0 z-50 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase bg-gray-50">Investor</th>
                  <th className="sticky top-0 z-50 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase bg-gray-50">Contact</th>
                  <th className="sticky top-0 z-50 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase bg-gray-50">Investment Date</th>
                  <th className="sticky top-0 z-50 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase bg-gray-50">FD Type</th>
                  <th className="sticky top-0 z-50 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase bg-gray-50">Maturity Date</th>
                  <th className="sticky top-0 z-50 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase bg-gray-50">Rate (%)</th>
                  <th className="sticky top-0 z-50 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase bg-gray-50">Principal</th>
                  <th className="sticky top-0 z-50 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase bg-gray-50">Maturity Amount</th>
                  <th className="sticky top-0 z-50 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase bg-gray-50">Payment Status</th>
                  <th className="sticky top-0 z-50 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase bg-gray-50">Payment Date</th>
                  <th className="sticky top-0 z-50 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase bg-gray-50">Status</th>
                  <th className="sticky top-0 z-50 px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase bg-gray-50">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredInvestments.map((investment) => (
                  <tr key={investment._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <User className="h-5 w-5 text-blue-600" />
                        </div>
                        <div className="ml-3">
                          <div className="text-sm font-medium text-gray-900">{investment.investorName}</div>
                          <div className="text-sm text-gray-500">{investment.address}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{investment.phone}</div>
                      <div className="text-sm text-gray-500">{investment.email || 'No email'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-900">
                        <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                        {formatDate(investment.investmentDate)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm">
                        <Badge variant={investment.fdType === 'monthly' ? 'warning' : 'success'}>
                          {investment.fdType === 'monthly' ? `${investment.termMonths} Months` : `${investment.termYears} Years`}
                        </Badge>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {investment.maturityDate ? formatDate(investment.maturityDate) : 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-green-600">{investment.investmentRate}%</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-bold text-gray-900">{formatCurrency(investment.investmentAmount)}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm">
                        <div className="font-bold text-blue-600">
                          {formatCurrency(investment.maturityAmount)}
                        </div>
                        <div className="text-xs text-gray-500">
                          Interest: {formatCurrency(
                            investment.maturityAmount && investment.investmentAmount
                              ? investment.maturityAmount - investment.investmentAmount
                              : 0
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge variant={
                        investment.paymentStatus === 'paid' ? 'success' :
                        investment.paymentStatus === 'partial' ? 'warning' : 'error'
                      }>
                        {investment.paymentStatus === 'paid' ? 'Paid' :
                         investment.paymentStatus === 'partial' ? 'Partial' : 'Pending'}
                      </Badge>
                      {investment.paymentMode && (
                        <div className="text-xs text-gray-500 mt-1">
                          via {investment.paymentMode}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {investment.paymentDate ? formatDate(investment.paymentDate) : 'Not paid'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <select
                        value={investment.status || 'active'}
                        onChange={(e) => handleStatusChange(investment._id, e.target.value)}
                        className={`text-sm font-medium px-3 py-1 rounded-full border-0 focus:ring-2 focus:ring-offset-1 ${
                          investment.status === 'active' 
                            ? 'bg-green-100 text-green-800 focus:ring-green-500' 
                            : investment.status === 'matured'
                            ? 'bg-blue-100 text-blue-800 focus:ring-blue-500'
                            : 'bg-gray-100 text-gray-800 focus:ring-gray-500'
                        }`}
                        disabled={!hasPermission(PERMISSIONS.INVESTMENTS_EDIT)}
                      >
                        <option value="active">Active</option>
                        <option value="matured">Matured</option>
                        <option value="withdrawn">Withdrawn</option>
                      </select>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end space-x-2">
                        {investment.paymentStatus !== 'paid' && (
                          <PermissionGuard permission={PERMISSIONS.INVESTMENTS_EDIT}>
                          <button
  onClick={() => handleOpenPaymentModal(investment)}
  className="
    inline-flex items-center gap-1
    px-3 py-1.5
    text-sm font-semibold
    text-white
    bg-green-600
    rounded-md
    shadow-sm
    hover:bg-green-700
    focus:outline-none focus:ring-2 focus:ring-green-500
    transition
  "
  title="Record Payment"
>
  Pay
</button>

                          </PermissionGuard>
                        )}
                        <PermissionGuard permission={PERMISSIONS.INVESTMENTS_EDIT}>
                          <button
                            onClick={() => handleOpenModal(investment)}
                            className="text-blue-600 hover:text-blue-900"
                            title="Edit"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                        </PermissionGuard>
                        <PermissionGuard permission={PERMISSIONS.INVESTMENTS_DELETE}>
                          <button
                            onClick={() => handleDelete(investment._id)}
                            className="text-red-600 hover:text-red-900"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </PermissionGuard>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredInvestments.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-500">No investments found</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={handleCloseModal} />
            
            <div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl">
              <div className="flex items-center justify-between p-6 border-b">
                <h2 className="text-xl font-semibold text-gray-900">
                  {editingInvestment ? 'Edit Investment' : 'Add New Investment'}
                </h2>
                <button onClick={handleCloseModal} className="text-gray-400 hover:text-gray-600">
                  <span className="text-2xl">&times;</span>
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Investment Plan
                    </label>
                    <select
                      value={formData.planId}
                      onChange={(e) => handleChange('planId', e.target.value)}
                      className={`input w-full ${errors.planId ? 'border-red-300' : ''}`}
                    >
                      <option value="">Select a plan (optional)</option>
                      {plans.map(plan => (
                        <option key={plan.id} value={plan.id}>{plan.name}</option>
                      ))}
                    </select>
                    {errors.planId && <p className="mt-1 text-sm text-red-600">{errors.planId}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Investor Name *
                    </label>
                    <input
                      type="text"
                      value={formData.investorName}
                      onChange={(e) => handleChange('investorName', e.target.value)}
                      className={`input w-full ${errors.investorName ? 'border-red-300' : ''}`}
                      placeholder="Enter investor name"
                    />
                    {errors.investorName && <p className="mt-1 text-sm text-red-600">{errors.investorName}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleChange('email', e.target.value)}
                      className={`input w-full ${errors.email ? 'border-red-300' : ''}`}
                      placeholder="investor@example.com"
                    />
                    {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Phone Number *
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => handleChange('phone', e.target.value)}
                      className={`input w-full ${errors.phone ? 'border-red-300' : ''}`}
                      placeholder="+91 98765 43210"
                    />
                    {errors.phone && <p className="mt-1 text-sm text-red-600">{errors.phone}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Address *
                    </label>
                    <input
                      type="text"
                      value={formData.address}
                      onChange={(e) => handleChange('address', e.target.value)}
                      className={`input w-full ${errors.address ? 'border-red-300' : ''}`}
                      placeholder="Enter address"
                    />
                    {errors.address && <p className="mt-1 text-sm text-red-600">{errors.address}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Investment Date *
                    </label>
                    <input
                      type="date"
                      value={formData.investmentDate}
                      onChange={(e) => handleChange('investmentDate', e.target.value)}
                      className={`input w-full ${errors.investmentDate ? 'border-red-300' : ''}`}
                    />
                    {errors.investmentDate && <p className="mt-1 text-sm text-red-600">{errors.investmentDate}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Payment Method *
                    </label>
                    <select
                      value={formData.paymentMethod}
                      onChange={(e) => handleChange('paymentMethod', e.target.value)}
                      className={`input w-full ${errors.paymentMethod ? 'border-red-300' : ''}`}
                    >
                      <option value="">Select Payment Method</option>
                      <option value="Cash">Cash</option>
                      <option value="Bank Transfer">Bank Transfer</option>
                      <option value="Cheque">Cheque</option>
                      <option value="Online">Online</option>
                      <option value="UPI">UPI</option>
                    </select>
                    {errors.paymentMethod && <p className="mt-1 text-sm text-red-600">{errors.paymentMethod}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Investment Rate (%) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.investmentRate}
                      onChange={(e) => handleChange('investmentRate', e.target.value)}
                      className={`input w-full ${errors.investmentRate ? 'border-red-300' : ''}`}
                      placeholder="e.g., 8.5"
                    />
                    {errors.investmentRate && <p className="mt-1 text-sm text-red-600">{errors.investmentRate}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Investment Amount *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.investmentAmount}
                      onChange={(e) => handleChange('investmentAmount', e.target.value)}
                      className={`input w-full ${errors.investmentAmount ? 'border-red-300' : ''}`}
                      placeholder="e.g., 100000"
                    />
                    {errors.investmentAmount && <p className="mt-1 text-sm text-red-600">{errors.investmentAmount}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      FD Type *
                    </label>
                    <select
                      value={formData.fdType}
                      onChange={(e) => {
                        handleChange('fdType', e.target.value);
                        // Clear term fields when switching type
                        handleChange('termMonths', '');
                        handleChange('termYears', '');
                      }}
                      className={`input w-full ${errors.fdType ? 'border-red-300' : ''}`}
                    >
                      <option value="monthly">Monthly</option>
                      <option value="yearly">Yearly</option>
                    </select>
                    {errors.fdType && <p className="mt-1 text-sm text-red-600">{errors.fdType}</p>}
                  </div>

                  {formData.fdType === 'monthly' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Term (Months) *
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="12"
                        value={formData.termMonths}
                        onChange={(e) => handleChange('termMonths', e.target.value)}
                        className={`input w-full ${errors.termMonths ? 'border-red-300' : ''}`}
                        placeholder="e.g., 6"
                      />
                      {errors.termMonths && <p className="mt-1 text-sm text-red-600">{errors.termMonths}</p>}
                    </div>
                  )}

                  {formData.fdType === 'yearly' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Term (Years) *
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="10"
                        value={formData.termYears}
                        onChange={(e) => handleChange('termYears', e.target.value)}
                        className={`input w-full ${errors.termYears ? 'border-red-300' : ''}`}
                        placeholder="e.g., 2"
                      />
                      {errors.termYears && <p className="mt-1 text-sm text-red-600">{errors.termYears}</p>}
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Payment Status
                    </label>
                    <select
                      value={formData.paymentStatus}
                      onChange={(e) => handleChange('paymentStatus', e.target.value)}
                      className="input w-full"
                    >
                      <option value="pending">Pending</option>
                      <option value="partial">Partial</option>
                      <option value="paid">Paid</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Payment Date
                    </label>
                    <input
                      type="date"
                      value={formData.paymentDate}
                      onChange={(e) => handleChange('paymentDate', e.target.value)}
                      className="input w-full"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Payment Mode
                    </label>
                    <select
                      value={formData.paymentMode}
                      onChange={(e) => handleChange('paymentMode', e.target.value)}
                      className="input w-full"
                    >
                      <option value="">Select Payment Mode</option>
                      <option value="Cash">Cash</option>
                      <option value="Bank Transfer">Bank Transfer</option>
                      <option value="Cheque">Cheque</option>
                      <option value="Online">Online</option>
                      <option value="UPI">UPI</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Status
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) => handleChange('status', e.target.value)}
                      className="input w-full"
                    >
                      <option value="active">Active</option>
                      <option value="matured">Matured</option>
                      <option value="withdrawn">Withdrawn</option>
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Notes
                    </label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => handleChange('notes', e.target.value)}
                      className="input w-full"
                      rows="3"
                      placeholder="Additional notes about the investment or payment"
                    />
                  </div>
                </div>

                {/* Maturity Calculation */}
                {formData.investmentAmount && formData.investmentRate && (formData.termMonths || formData.termYears) && (
                  <div className="mt-6 bg-gradient-to-r from-blue-50 to-green-50 rounded-lg p-6 border-2 border-blue-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Maturity Calculation</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-white rounded-lg p-4 shadow-sm">
                        <p className="text-xs text-gray-500 mb-1">Principal Amount</p>
                        <p className="text-xl font-bold text-gray-900 flex items-center">
                          <IndianRupee className="h-5 w-5 mr-1" />
                          {parseFloat(formData.investmentAmount).toLocaleString('en-IN')}
                        </p>
                      </div>
                      <div className="bg-white rounded-lg p-4 shadow-sm">
                        <p className="text-xs text-gray-500 mb-1">Interest Earned</p>
                        <p className="text-xl font-bold text-green-600 flex items-center">
                          <IndianRupee className="h-5 w-5 mr-1" />
                          {(() => {
                            const principal = parseFloat(formData.investmentAmount);
                            const rate = parseFloat(formData.investmentRate);
                            const fdType = formData.fdType;
                            const termMonths = formData.termMonths ? parseFloat(formData.termMonths) : undefined;
                            const termYears = formData.termYears ? parseFloat(formData.termYears) : undefined;
                            if (Number.isNaN(principal) || Number.isNaN(rate)) return '0';
                            const { interest } = computeFdMaturity({ principal, ratePercent: rate, fdType, termMonths, termYears });
                            return interest.toLocaleString('en-IN', { maximumFractionDigits: 2 });
                          })()}
                        </p>
                      </div>
                      <div className="bg-gradient-to-br from-blue-500 to-green-500 rounded-lg p-4 shadow-md">
                        <p className="text-xs text-white mb-1">Maturity Amount</p>
                        <p className="text-xl font-bold text-white flex items-center">
                          <IndianRupee className="h-5 w-5 mr-1" />
                          {(() => {
                            const principal = parseFloat(formData.investmentAmount);
                            const rate = parseFloat(formData.investmentRate);
                            const fdType = formData.fdType;
                            const termMonths = formData.termMonths ? parseFloat(formData.termMonths) : undefined;
                            const termYears = formData.termYears ? parseFloat(formData.termYears) : undefined;
                            if (Number.isNaN(principal) || Number.isNaN(rate)) return '0';
                            const { maturityAmount } = computeFdMaturity({ principal, ratePercent: rate, fdType, termMonths, termYears });
                            return maturityAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 });
                          })()}
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 text-sm text-gray-600 bg-white rounded p-3">
                      <p className="font-medium">Calculation: {formData.fdType === 'monthly' ? 'Simple Interest (monthly)' : 'Compound Interest (yearly)'}</p>
                      <p className="text-xs mt-1">
                        {formData.fdType === 'monthly' ? 'Maturity = Principal + (Principal × r × t) (simple interest, t in years)' : 'Maturity = Principal × (1 + r/n)\u207F (compound interest)'}
                        {formData.fdType === 'monthly' && ` | t = ${formData.termMonths} months = ${(parseFloat(formData.termMonths) / 12).toFixed(2)} years`}
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="btn btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                  >
                    {editingInvestment ? 'Update Investment' : 'Add Investment'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && paymentInvestment && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={handleClosePaymentModal} />
            
            <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md">
              <div className="flex items-center justify-between p-6 border-b">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Record Payment</h2>
                  <p className="text-sm text-gray-600 mt-1">{paymentInvestment.investorName}</p>
                </div>
                <button onClick={handleClosePaymentModal} className="text-gray-400 hover:text-gray-600">
                  <span className="text-2xl">&times;</span>
                </button>
              </div>

              <form onSubmit={handleRecordPayment} className="p-6">
                <div className="space-y-4">
                  {/* Investment Summary */}
                  <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-gray-600">Investment Amount:</span>
                      <span className="text-lg font-bold text-gray-900">
                        {formatCurrency(paymentInvestment.investmentAmount)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Current Status:</span>
                      <Badge variant={
                        paymentInvestment.paymentStatus === 'paid' ? 'success' :
                        paymentInvestment.paymentStatus === 'partial' ? 'warning' : 'error'
                      }>
                        {paymentInvestment.paymentStatus === 'paid' ? 'Paid' :
                         paymentInvestment.paymentStatus === 'partial' ? 'Partial' : 'Pending'}
                      </Badge>
                    </div>
                  </div>

                  {/* Payment Amount */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Payment Amount *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={paymentFormData.paymentAmount}
                      onChange={(e) => setPaymentFormData(prev => ({ ...prev, paymentAmount: e.target.value }))}
                      className="input w-full"
                      placeholder="Enter payment amount"
                      required
                    />
                  </div>

                  {/* Payment Date */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Payment Date *
                    </label>
                    <input
                      type="date"
                      value={paymentFormData.paymentDate}
                      onChange={(e) => setPaymentFormData(prev => ({ ...prev, paymentDate: e.target.value }))}
                      className="input w-full"
                      required
                    />
                  </div>

                  {/* Payment Mode */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Payment Mode *
                    </label>
                    <select
                      value={paymentFormData.paymentMode}
                      onChange={(e) => setPaymentFormData(prev => ({ ...prev, paymentMode: e.target.value }))}
                      className="input w-full"
                      required
                    >
                      <option value="">Select Payment Mode</option>
                      <option value="Cash">Cash</option>
                      <option value="Bank Transfer">Bank Transfer</option>
                      <option value="Cheque">Cheque</option>
                      <option value="Online">Online</option>
                      <option value="UPI">UPI</option>
                    </select>
                  </div>

                  {/* Payment Status */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Payment Status *
                    </label>
                    <select
                      value={paymentFormData.paymentStatus}
                      onChange={(e) => setPaymentFormData(prev => ({ ...prev, paymentStatus: e.target.value }))}
                      className="input w-full"
                    >
                      <option value="paid">Paid (Full)</option>
                      <option value="partial">Partial Payment</option>
                      <option value="pending">Pending</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    type="button"
                    onClick={handleClosePaymentModal}
                    className="btn btn-secondary"
                    disabled={paymentSubmitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary flex items-center"
                    disabled={paymentSubmitting}
                  >
                    {paymentSubmitting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Processing...
                      </>
                    ) : (
                      'Record Payment'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Investors;
