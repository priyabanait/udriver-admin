import { useState, useEffect } from 'react';
import { 
  CreditCard, 
  IndianRupee, 
  TrendingUp, 
  Users, 
  Calendar,
  Download,
  Search,
  Filter,
  Eye,
  Check,
  Clock,
  AlertTriangle,
  Wallet,
  Building,
  User,
  Phone,
  Mail
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/Table';
import { formatDate, formatCurrency } from '../../utils';
import { useAuth } from '../../contexts/AuthContext';
import { PermissionGuard } from '../../components/guards/PermissionGuards';
import { PERMISSIONS } from '../../utils/permissions';
import toast from 'react-hot-toast';

export default function PaymentProcess() {
  const { hasPermission } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [paymentModeFilter, setPaymentModeFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  
  const [investmentPayments, setInvestmentPayments] = useState([]);
  const [selectedPayment, setSelectedPayment] = useState(null);

  // Fetch investment payments with payment details
  useEffect(() => {
    loadPayments();
  }, []);

  const loadPayments = async () => {
    setLoading(true);
    try {
      const API_BASE = import.meta.env.VITE_API_BASE || 'https://udrive-backend-1igb.vercel.app';
      const res = await fetch(`${API_BASE}/api/investment-fds`);
      if (res.ok) {
        const data = await res.json();
        // Show all investments with their payment status
        const paymentsWithDetails = Array.isArray(data) ? data : (data.data || []);
        setInvestmentPayments(paymentsWithDetails);
      } else {
        toast.error('Failed to load payments');
      }
    } catch (err) {
      console.error('Failed to load payments:', err);
      toast.error('Failed to load payments');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'paid':
        return <Badge variant="success" className="flex items-center gap-1"><Check className="h-3 w-3" />Paid</Badge>;
      case 'partial':
        return <Badge variant="warning" className="flex items-center gap-1"><Clock className="h-3 w-3" />Partial</Badge>;
      case 'pending':
        return <Badge variant="danger" className="flex items-center gap-1"><AlertTriangle className="h-3 w-3" />Pending</Badge>;
      default:
        return <Badge variant="secondary">{status || 'Unknown'}</Badge>;
    }
  };

  const getPaymentModeBadge = (mode) => {
    if (!mode) return <Badge variant="secondary">Not Set</Badge>;
    
    switch (mode.toLowerCase()) {
      case 'online':
        return <Badge variant="info" className="flex items-center gap-1"><CreditCard className="h-3 w-3" />Online</Badge>;
      case 'cash':
        return <Badge variant="success" className="flex items-center gap-1"><Wallet className="h-3 w-3" />Cash</Badge>;
      case 'bank transfer':
        return <Badge variant="info" className="flex items-center gap-1"><Building className="h-3 w-3" />Bank Transfer</Badge>;
      case 'upi':
        return <Badge variant="info" className="flex items-center gap-1"><CreditCard className="h-3 w-3" />UPI</Badge>;
      case 'cheque':
        return <Badge variant="secondary" className="flex items-center gap-1"><CreditCard className="h-3 w-3" />Cheque</Badge>;
      default:
        return <Badge variant="secondary">{mode}</Badge>;
    }
  };

  // Filter payments
  const filteredPayments = investmentPayments.filter(payment => {
    const matchesSearch = 
      payment.investorName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.phone?.includes(searchTerm) ||
      payment.email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || payment.paymentStatus === statusFilter;
    const matchesMode = paymentModeFilter === 'all' || payment.paymentMode?.toLowerCase() === paymentModeFilter.toLowerCase();
    
    return matchesSearch && matchesStatus && matchesMode;
  });

  // Calculate statistics
  const stats = {
    totalPayments: filteredPayments.length,
    totalAmount: filteredPayments.reduce((sum, p) => sum + (p.investmentAmount || 0), 0),
    paidPayments: filteredPayments.filter(p => p.paymentStatus === 'paid').length,
    pendingPayments: filteredPayments.filter(p => p.paymentStatus === 'pending').length,
    partialPayments: filteredPayments.filter(p => p.paymentStatus === 'partial').length,
    onlinePayments: filteredPayments.filter(p => p.paymentMode?.toLowerCase() === 'online').length,
    cashPayments: filteredPayments.filter(p => p.paymentMode?.toLowerCase() === 'cash').length
  };

  const handleExport = () => {
    const csvData = filteredPayments.map(p => ({
      'Investor Name': p.investorName,
      'Phone': p.phone,
      'Email': p.email || 'N/A',
      'Amount': p.investmentAmount,
      'Payment Mode': p.paymentMode || 'N/A',
      'Payment Status': p.paymentStatus,
      'Payment Date': p.paymentDate ? formatDate(p.paymentDate) : 'N/A',
      'Investment Date': formatDate(p.investmentDate),
      'FD Type': p.fdType,
      'Term': p.fdType === 'monthly' ? `${p.termMonths} months` : `${p.termYears} years`,
      'Rate': `${p.investmentRate}%`
    }));
    
    const csv = [
      Object.keys(csvData[0]).join(','),
      ...csvData.map(row => Object.values(row).join(','))
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payment-records-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    toast.success('Payment records exported successfully');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payment Records</h1>
          <p className="text-gray-600">Track all investment FD payments and investor information</p>
        </div>
        <PermissionGuard permission={PERMISSIONS.REPORTS_EXPORT}>
          <button onClick={handleExport} className="btn btn-secondary mt-4 sm:mt-0 flex items-center gap-2">
            <Download className="h-4 w-4" />
            Export CSV
          </button>
        </PermissionGuard>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Payments</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalPayments}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <CreditCard className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Amount</p>
                <p className="text-2xl font-bold text-gray-900">₹{stats.totalAmount.toLocaleString('en-IN')}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <IndianRupee className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Payment Status</p>
                <p className="text-2xl font-bold text-green-600">{stats.paidPayments}</p>
                <p className="text-xs text-gray-500">Pending: {stats.pendingPayments} | Partial: {stats.partialPayments}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <Check className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Payment Modes</p>
                <p className="text-sm font-semibold text-gray-900">Online: {stats.onlinePayments}</p>
                <p className="text-sm font-semibold text-gray-900">Cash: {stats.cashPayments}</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-lg">
                <Wallet className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, phone, email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input pl-10 w-full"
              />
            </div>
            
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input w-full"
            >
              <option value="all">All Status</option>
              <option value="paid">Paid</option>
              <option value="partial">Partial</option>
              <option value="pending">Pending</option>
            </select>

            <select
              value={paymentModeFilter}
              onChange={(e) => setPaymentModeFilter(e.target.value)}
              className="input w-full"
            >
              <option value="all">All Payment Modes</option>
              <option value="Cash">Cash</option>
              <option value="Online">Online</option>
              <option value="Bank Transfer">Bank Transfer</option>
              <option value="UPI">UPI</option>
              <option value="Cheque">Cheque</option>
            </select>

            <button
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('all');
                setPaymentModeFilter('all');
              }}
              className="btn btn-secondary"
            >
              Clear Filters
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Payment Records Table */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Records</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Investor Details</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Payment Info</TableHead>
                  <TableHead>Investment Details</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPayments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                      No payment records found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPayments.map((payment) => (
                    <TableRow key={payment._id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                            <User className="h-5 w-5 text-primary-600" />
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">{payment.investorName}</p>
                            <p className="text-xs text-gray-500">ID: {payment._id.slice(-6)}</p>
                          </div>
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-1 text-sm">
                            <Phone className="h-3 w-3 text-gray-400" />
                            <span>{payment.phone}</span>
                          </div>
                          {payment.email && (
                            <div className="flex items-center gap-1 text-xs text-gray-500">
                              <Mail className="h-3 w-3" />
                              <span>{payment.email}</span>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <div>
                          <p className="font-bold text-green-600">
                            ₹{payment.investmentAmount?.toLocaleString('en-IN')}
                          </p>
                          <p className="text-xs text-gray-500">{payment.investmentRate}% p.a.</p>
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <div className="space-y-1">
                          <div>{getPaymentModeBadge(payment.paymentMode)}</div>
                          <p className="text-xs text-gray-500">
                            {payment.paymentDate ? formatDate(payment.paymentDate) : 'Not paid yet'}
                          </p>
                          <p className="text-xs text-gray-500">
                            Method: {payment.paymentMethod}
                          </p>
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <div className="space-y-1">
                          <p className="text-sm font-medium">
                            {payment.fdType === 'monthly' 
                              ? `${payment.termMonths} months` 
                              : `${payment.termYears} years`}
                          </p>
                          <p className="text-xs text-gray-500">
                            Started: {formatDate(payment.investmentDate)}
                          </p>
                          {payment.planName && (
                            <p className="text-xs text-blue-600">{payment.planName}</p>
                          )}
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        {getStatusBadge(payment.paymentStatus)}
                      </TableCell>
                      
                      <TableCell>
                        <button
                          onClick={() => setSelectedPayment(payment)}
                          className="text-primary-600 hover:text-primary-700 flex items-center gap-1"
                        >
                          <Eye className="h-4 w-4" />
                          View
                        </button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Payment Detail Modal */}
      {selectedPayment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">Payment Details</h2>
                <button
                  onClick={() => setSelectedPayment(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Investor Information */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Investor Information
                </h3>
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Name:</span>
                    <span className="text-sm font-medium">{selectedPayment.investorName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Phone:</span>
                    <span className="text-sm font-medium">{selectedPayment.phone}</span>
                  </div>
                  {selectedPayment.email && (
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Email:</span>
                      <span className="text-sm font-medium">{selectedPayment.email}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Address:</span>
                    <span className="text-sm font-medium text-right">{selectedPayment.address}</span>
                  </div>
                </div>
              </div>

              {/* Payment Information */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  Payment Information
                </h3>
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Amount:</span>
                    <span className="text-lg font-bold text-green-600">
                      ₹{selectedPayment.investmentAmount?.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Payment Mode:</span>
                    {getPaymentModeBadge(selectedPayment.paymentMode)}
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Payment Method:</span>
                    <span className="text-sm font-medium">{selectedPayment.paymentMethod}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Payment Status:</span>
                    {getStatusBadge(selectedPayment.paymentStatus)}
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Payment Date:</span>
                    <span className="text-sm font-medium">
                      {selectedPayment.paymentDate ? formatDate(selectedPayment.paymentDate) : 'Not paid yet'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Investment Details */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <Building className="h-4 w-4" />
                  Investment Details
                </h3>
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">FD Type:</span>
                    <span className="text-sm font-medium capitalize">{selectedPayment.fdType}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Term:</span>
                    <span className="text-sm font-medium">
                      {selectedPayment.fdType === 'monthly' 
                        ? `${selectedPayment.termMonths} months` 
                        : `${selectedPayment.termYears} years`}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Interest Rate:</span>
                    <span className="text-sm font-medium">{selectedPayment.investmentRate}% p.a.</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Maturity Amount:</span>
                    <span className="text-sm font-bold text-blue-600">
                      ₹{selectedPayment.maturityAmount?.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Investment Date:</span>
                    <span className="text-sm font-medium">{formatDate(selectedPayment.investmentDate)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Maturity Date:</span>
                    <span className="text-sm font-medium">
                      {selectedPayment.maturityDate ? formatDate(selectedPayment.maturityDate) : 'N/A'}
                    </span>
                  </div>
                  {selectedPayment.planName && (
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Plan Name:</span>
                      <span className="text-sm font-medium">{selectedPayment.planName}</span>
                    </div>
                  )}
                  {selectedPayment.notes && (
                    <div className="pt-2 border-t">
                      <span className="text-sm text-gray-600">Notes:</span>
                      <p className="text-sm mt-1">{selectedPayment.notes}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200">
              <button
                onClick={() => setSelectedPayment(null)}
                className="btn btn-secondary w-full"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
