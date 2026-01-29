import { useState, useEffect } from 'react';
// Helper to get initial extra state for all selections
import { useMemo } from 'react';
import { CreditCard, Users, Download, Search, Check, Clock, AlertTriangle, Wallet, User, Phone, IndianRupee, Eye, ChevronDown, CheckCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/Table';
import { formatDate } from '../../utils';
import { PermissionGuard } from '../../components/guards/PermissionGuards';
import { PERMISSIONS } from '../../utils/permissions';
import toast from 'react-hot-toast';
import ZwitchPaymentModal from '../../components/payments/ZwitchPaymentModal';

export default function DriverPayments() {
  const { user } = useAuth(); // Get logged-in user
  const isManager = user?.role === 'fleet_manager';
  // Manager dropdown state
  const [managers, setManagers] = useState([]);
  const [selectedManagers, setSelectedManagers] = useState({}); // { selectionId: managerId }
   const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [modeFilter, setModeFilter] = useState('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [selections, setSelections] = useState([]);
  const [selectedDetail, setSelectedDetail] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [openDropdown, setOpenDropdown] = useState(null);
  const [rentSummaries, setRentSummaries] = useState({});
  // Pagination state (moved up so effects can reset page when filters/search change)
  const rowsPerPage = 5;
  const [currentPage, setCurrentPage] = useState(1);
  // Vehicles & Plans for assignment
  const [vehicles, setVehicles] = useState([]);
  const [weeklyPlans, setWeeklyPlans] = useState([]);
  const [dailyPlans, setDailyPlans] = useState([]);
  const [assigningVehicleForSelection, setAssigningVehicleForSelection] = useState(null);

  // State for online payment modal
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);
  // State for editing extra amount/reason per row
  const [extraInputs, setExtraInputs] = useState({});
  // State for adjustment amount and reason per row
  const [adjustmentInputs, setAdjustmentInputs] = useState({});
  // State for admin paid amount per row (for cash payments)
  const [adminPaidInputs, setAdminPaidInputs] = useState({});

  // Sync extraInputs state when selections change - keep inputs empty for new entries
  useEffect(() => {
    // Initialize inputs only for new selections, preserve existing input state
    setExtraInputs(prev => {
      const newState = { ...prev };
      selections.flat().forEach(s => {
        if (!newState[s._id]) {
          newState[s._id] = {
            amount: '', // Keep empty for new extra amount input
            reason: '', // Keep empty for new reason input
            loading: false
          };
        }
      });
      return newState;
    });
    
    setAdjustmentInputs(prev => {
      const newState = { ...prev };
      selections.flat().forEach(s => {
        if (!newState[s._id]) {
          newState[s._id] = {
            amount: '', // Keep empty for new adjustment input
            reason: '', // Keep empty for new reason input
            loading: false
          };
        }
      });
      return newState;
    });
    
    setAdminPaidInputs(prev => {
      const newState = { ...prev };
      selections.flat().forEach(s => {
        if (!newState[s._id]) {
          newState[s._id] = {
            amount: '', // Always start with empty amount for new payments
            paymentType: 'rent', // Default to rent
            loading: false
          };
        }
      });
      return newState;
    });
  }, [selections]);
  // Save handler for extra amount/reason
    // Save handler for adjustment amount and reason
    const handleSaveAdjustment = async (selectionId) => {
      const { amount, reason } = adjustmentInputs[selectionId] || {};
      
      if (!amount || Number(amount) <= 0) {
        toast.error('Please enter a valid adjustment amount');
        return;
      }
      
      setAdjustmentInputs(prev => ({
        ...prev,
        [selectionId]: { ...prev[selectionId], loading: true }
      }));
      
      try {
        const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';
        const token = localStorage.getItem('token');
        
        const res = await fetch(`${API_BASE}/api/driver-plan-selections/${selectionId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          },
          body: JSON.stringify({ adjustmentAmount: Number(amount) || 0, adjustmentReason: reason || 'Adjustment' })
        });
        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.message || 'Failed to update adjustment amount');
        }
        
        const result = await res.json();
        
        // Update local state with cumulative adjustment
        setSelections(prev => prev.map(group =>
          group.map(s =>
            s._id === selectionId
              ? { 
                  ...s, 
                  adjustmentAmount: result.selection.adjustmentAmount,
                  adjustmentReason: result.selection.adjustmentReason
                }
              : s
          )
        ));
        
        // Clear input fields after successful save
        setAdjustmentInputs(prev => ({
          ...prev,
          [selectionId]: { amount: '', reason: '', loading: false }
        }));
        
        toast.success(`Added ₹${Number(amount).toLocaleString('en-IN')} to adjustments. Total: ₹${result.selection.adjustmentAmount.toLocaleString('en-IN')}`);
      } catch (e) {
        toast.error(e.message || 'Failed to update adjustment amount');
        setAdjustmentInputs(prev => ({
          ...prev,
          [selectionId]: { ...prev[selectionId], loading: false }
        }));
      }
    };
  const handleSaveExtra = async (selectionId) => {
    setExtraInputs(prev => ({
      ...prev,
      [selectionId]: { ...prev[selectionId], loading: true }
    }));
    try {
      const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';
      const token = localStorage.getItem('token');
      const { amount, reason } = extraInputs[selectionId];
      const res = await fetch(`${API_BASE}/api/driver-plan-selections/${selectionId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ extraAmount: Number(amount) || 0, extraReason: reason })
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to update extra amount');
      }
      // Update local state for this selection
      setSelections(prev => prev.map(group =>
        group.map(s =>
          s._id === selectionId
            ? { ...s, extraAmount: Number(amount) || 0, extraReason: reason }
            : s
        )
      ));
      
      // Clear input fields after successful save
      setExtraInputs(prev => ({
        ...prev,
        [selectionId]: { amount: '', reason: '', loading: false }
      }));
      
      toast.success('Extra amount updated');
    } catch (e) {
      toast.error(e.message || 'Failed to update extra amount');
      setExtraInputs(prev => ({
        ...prev,
        [selectionId]: { ...prev[selectionId], loading: false }
      }));
    }
  };
  
  // Save handler for admin paid amount (all payment methods)
  const handleSaveAdminPaid = async (selectionId) => {
    const { amount, paymentType } = adminPaidInputs[selectionId] || {};
    
    if (!amount || Number(amount) <= 0) {
      toast.error('Please enter a valid admin paid amount');
      return;
    }
    
    if (!paymentType || !['rent', 'security', 'total'].includes(paymentType)) {
      toast.error('Please select payment type (Deposit, Rent, or Total Payable)');
      return;
    }
    
    setAdminPaidInputs(prev => ({
      ...prev,
      [selectionId]: { ...prev[selectionId], loading: true }
    }));
    
    try {
      const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';
      const token = localStorage.getItem('token');
      
      const res = await fetch(`${API_BASE}/api/driver-plan-selections/${selectionId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ 
          adminPaidAmount: Number(amount) || 0,
          adminPaymentType: paymentType // Send payment type to backend
        })
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to update admin paid amount');
      }
      
      const result = await res.json();
      
      // Reload selections to get updated payment details
      const refreshRes = await fetch(`${API_BASE}/api/driver-plan-selections/${selectionId}`);
      if (refreshRes.ok) {
        const refreshed = await refreshRes.json();
        const refreshedSelection = refreshed.data || refreshed;
        
        // Update local state with refreshed data including all payment details
        setSelections(prev => prev.map(group =>
          group.map(s =>
            s._id === selectionId
              ? { 
                  ...s, 
                  adminPaidAmount: refreshedSelection.adminPaidAmount || 0,
                  paidAmount: refreshedSelection.paidAmount || 0,
                  paymentType: refreshedSelection.paymentType || s.paymentType,
                  depositPaid: refreshedSelection.depositPaid || 0,
                  rentPaid: refreshedSelection.rentPaid || 0,
                  // Update paymentDetails - this is critical for showing updated rent due and total payable
                  paymentDetails: refreshedSelection.paymentDetails || refreshedSelection.paymentBreakdown ? {
                    rentDue: refreshedSelection.paymentDetails?.rentDue ?? refreshedSelection.paymentBreakdown?.rent ?? 0,
                    depositDue: refreshedSelection.paymentDetails?.depositDue ?? 0,
                    totalPayable: refreshedSelection.paymentDetails?.totalPayable ?? refreshedSelection.paymentBreakdown?.totalAmount ?? 0,
                    extraAmount: refreshedSelection.paymentDetails?.extraAmount ?? refreshedSelection.paymentBreakdown?.extraAmount ?? 0,
                    accidentalCover: refreshedSelection.paymentDetails?.accidentalCover ?? refreshedSelection.paymentBreakdown?.accidentalCover ?? 0,
                    paidAmount: refreshedSelection.paymentDetails?.paidAmount ?? refreshedSelection.paidAmount ?? 0
                  } : s.paymentDetails
                }
              : s
          )
        ));
      } else {
        // Fallback: update with result data (includes paymentDetails from PATCH response)
        setSelections(prev => prev.map(group =>
          group.map(s =>
            s._id === selectionId
              ? { 
                  ...s, 
                  adminPaidAmount: result.selection.adminPaidAmount || 0,
                  paidAmount: result.selection.paidAmount || 0,
                  paymentType: result.selection.paymentType || s.paymentType,
                  depositPaid: result.selection.depositPaid || 0,
                  rentPaid: result.selection.rentPaid || 0,
                  paymentDetails: result.selection.paymentDetails || s.paymentDetails
                }
              : s
          )
        ));
      }
      
      const typeLabel = paymentType === 'security' ? 'Deposit' : paymentType === 'total' ? 'Total Payable' : 'Rent';
      toast.success(`Admin paid ₹${Number(amount).toLocaleString('en-IN')} for ${typeLabel}`);
      
      // Clear the input after successful save and refresh
      setAdminPaidInputs(prev => ({
        ...prev,
        [selectionId]: { amount: '', paymentType: 'rent', loading: false }
      }));
    } catch (e) {
      toast.error(e.message || 'Failed to update admin paid amount');
    } finally {
      setAdminPaidInputs(prev => ({
        ...prev,
        [selectionId]: { ...prev[selectionId], loading: false }
      }));
    }
  };
    // Delete handler
    const handleDelete = async (selectionId) => {
      if (!window.confirm('Are you sure you want to delete this payment record?')) return;
      try {
        const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';
        const res = await fetch(`${API_BASE}/api/driver-plan-selections/${selectionId}`, {
          method: 'DELETE'
        });
        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.message || 'Failed to delete record');
        }
        toast.success('Payment record deleted');
        // Remove deleted selection from grouped local state
        setSelections(prev => {
          // prev is an array of groups (arrays). Remove the selection from each group.
          const updated = prev
            .map(group => group.filter(item => item._id !== selectionId))
            .filter(group => group.length > 0);
          return updated;
        });

        // Clean up any input state related to this selection
        setExtraInputs(prev => {
          const next = { ...prev };
          delete next[selectionId];
          return next;
        });
        setAdjustmentInputs(prev => {
          const next = { ...prev };
          delete next[selectionId];
          return next;
        });
        setAdminPaidInputs(prev => {
          const next = { ...prev };
          delete next[selectionId];
          return next;
        });
        setRentSummaries(prev => {
          const next = { ...prev };
          delete next[selectionId];
          return next;
        });
      } catch (e) {
        console.error('Delete error:', e);
        toast.error(e.message || 'Failed to delete record');
      }
    };

    // Assign or unassign a vehicle for a driver-plan selection
    const handleAssignVehicleToSelection = async (selectionId, vehicleId) => {
      try {
        if (!selectionId) return;
        const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';
        const token = localStorage.getItem('token');

        // If blank vehicleId, unassign
        if (!vehicleId) {
          setAssigningVehicleForSelection(selectionId);
          const res = await fetch(`${API_BASE}/api/driver-plan-selections/${selectionId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : {}) },
            body: JSON.stringify({ vehicleAssigned: '' })
          });
          if (!res.ok) throw new Error(`Failed to unassign vehicle: ${res.status}`);
          await loadSelections();
          toast.success('Vehicle unassigned from selection');
          return;
        }

        const vehicle = vehicles.find(v => (v._id === vehicleId || String(v.vehicleId) === String(vehicleId) || v.registrationNumber === vehicleId || v.vehicleNumber === vehicleId));
        if (!vehicle) throw new Error('Selected vehicle not found');

        const assignmentValue = vehicle.registrationNumber || vehicle.vehicleNumber || vehicle._id || vehicle.vehicleId;
        setAssigningVehicleForSelection(selectionId);

        const res = await fetch(`${API_BASE}/api/driver-plan-selections/${selectionId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : {}) },
          body: JSON.stringify({ vehicleAssigned: assignmentValue })
        });

        if (!res.ok) {
          const body = await res.json().catch(() => null);
          throw new Error(body?.message || `Failed to assign vehicle: ${res.status}`);
        }

        await loadSelections();
        toast.success(`Assigned vehicle ${assignmentValue} to selection`);
      } catch (err) {
        console.error('Assign vehicle error:', err);
        toast.error(err.message || 'Failed to assign vehicle');
      } finally {
        setAssigningVehicleForSelection(null);
      }
    };

  useEffect(() => {
    // moved fetching logic below (mirrors DriversList pattern)
  }, []);

  // Fetch payments from server (supports filters and pagination)
  const fetchPayments = async (page = 1) => {
    setLoading(true);
    try {
      const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';
      const managerFilter = isManager ? (user?.email || user?.id) : (selectedManagers?.filter || '');

      // Fetch managers for dropdown (only if not a manager user)
      if (!isManager && managers.length === 0) {
        try {
          const token = localStorage.getItem('token');
          const mgrRes = await fetch(`${API_BASE}/api/managers?page=1&limit=100`, {
            headers: token ? { Authorization: `Bearer ${token}` } : undefined
          });
          if (mgrRes.ok) {
            const mr = await mgrRes.json();
            const md = mr.data || mr;
            setManagers(Array.isArray(md) ? md : []);
          }
        } catch (e) {
          console.error('Error loading managers:', e);
        }
      }

      const params = new URLSearchParams();
      if (searchTerm) params.append('term', searchTerm);
      if (statusFilter) params.append('status', statusFilter);
      if (modeFilter) params.append('mode', modeFilter);
      if (fromDate) params.append('from', fromDate);
      if (toDate) params.append('to', toDate);
      if (managerFilter) params.append('manager', managerFilter);
      params.append('page', String(page));
      params.append('limit', '100');

      const url = `${API_BASE}/api/driver-plan-selections/search?${params.toString()}`;
      console.log('Fetching payments (search):', url);
      const res = await fetch(url);
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: `HTTP ${res.status}` }));
        throw new Error(errorData.message || `Failed to load payments: ${res.status}`);
      }
      const result = await res.json();
      const data = result.data || result;

      // Include selections where payment has been made or is pending, or where vehicle assignment/rent has started.
      const assignedDriverRecords = (Array.isArray(data) ? data : []).filter(s => {
        if (s.paymentStatus === 'pending' || s.paymentStatus === 'completed') return true;
        return !!(s.vehicleId || s.rentStartDate);
      });

      // Group by driverMobile or driverUsername
      const grouped = {};
      assignedDriverRecords.forEach(s => {
        const key = s.driverMobile || s.driverUsername || s._id;
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(s);
      });
      setSelections(Object.values(grouped));
    } catch (err) {
      console.error('Error loading payments:', err);
      toast.error(err.message || 'Failed to load payments');
      setSelections([]);
    } finally {
      setLoading(false);
    }
  };

  // Call once on mount
  useEffect(() => {
    fetchPayments(1);
  }, [isManager, user?.email, user?.id]);

  // Debounced refetch when filters/search change
  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentPage(1);
      fetchPayments(1);
    }, 1000);
    return () => clearTimeout(timer);
  }, [searchTerm, statusFilter, modeFilter, fromDate, toDate, selectedManagers?.filter, isManager, user?.email, user?.id]);

  // Debug: log selections after fetch
 useEffect(() => {
  console.log("DEBUG: Selections array:", selections);
  console.log("DEBUG: Selected manager filter:", selectedManagers?.filter);
}, [selections, selectedManagers]);


  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (openDropdown && !event.target.closest('.status-dropdown')) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openDropdown]);

  // Refresh selections if a vehicle update reports selections were updated
  useEffect(() => {
    const handler = (e) => {
      console.log('Driver selections updated, refreshing list...', e?.detail);
      loadSelections();
    };
    window.addEventListener('driverSelectionsUpdated', handler);
    return () => window.removeEventListener('driverSelectionsUpdated', handler);
  }, []);

  const loadSelections = async () => {
    setLoading(true);
    try {
      const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';
      const res = await fetch(`${API_BASE}/api/driver-plan-selections?page=1&limit=100`);
      if (!res.ok) throw new Error('Failed to load driver payments');
      const result = await res.json();
      const data = result.data || result;
      // Only consider selections that have a payment status recorded
      const withPayments = data.filter(s => s.paymentStatus === 'completed' || s.paymentStatus === 'pending');
      // Group by driverMobile
      const grouped = {};
      withPayments.forEach(s => {
        const key = s.driverMobile || s.driverUsername || s._id;
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(s);
      });
      setSelections(Object.values(grouped));

      // Fetch vehicles and plans for assignment dropdowns
      try {
        const [vehiclesRes, weeklyRes, dailyRes] = await Promise.all([
          fetch(`${API_BASE}/api/vehicles?page=1&limit=100`),
          fetch(`${API_BASE}/api/weekly-rent-plans`),
          fetch(`${API_BASE}/api/daily-rent-plans`)
        ]);
        if (vehiclesRes.ok) {
          const vd = await vehiclesRes.json();
          const list = vd.data || vd;
          setVehicles(Array.isArray(list) ? list : []);
        }
        if (weeklyRes.ok) {
          const wd = await weeklyRes.json();
          setWeeklyPlans(Array.isArray(wd) ? wd : []);
        }
        if (dailyRes.ok) {
          const dd = await dailyRes.json();
          setDailyPlans(Array.isArray(dd) ? dd : []);
        }
      } catch (fetchErr) {
        console.error('Failed to fetch vehicles/plans for payments page', fetchErr);
      }

      // Fetch rent summaries for all transactions where rent has actually started (vehicle active)
      const idsToFetch = withPayments.filter(s => s.rentStartDate && s.vehicleStatus === 'active').map(s => s._id);
      if (idsToFetch.length > 0) {
        const summaries = {};
        await Promise.all(
          idsToFetch.map(async (id) => {
            try {
              const summaryRes = await fetch(`${API_BASE}/api/driver-plan-selections/${id}/rent-summary`);
              if (summaryRes.ok) {
                summaries[id] = await summaryRes.json();
              }
            } catch (err) {
              console.error(`Failed to load summary for ${id}:`, err);
            }
          })
        );
        setRentSummaries(summaries);
      }
    } catch (e) {
      console.error(e);
      toast.error('Failed to load driver payments');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'completed':
        return <Badge variant="success" className="flex items-center gap-1"><Check className="h-3 w-3" />Completed</Badge>;
      case 'pending':
        return <Badge variant="warning" className="flex items-center gap-1"><Clock className="h-3 w-3" />Pending</Badge>;
      case 'failed':
        return <Badge variant="danger" className="flex items-center gap-1"><AlertTriangle className="h-3 w-3" />Failed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getModeBadge = (mode) => {
    switch (mode) {
      case 'online':
        return <Badge variant="info" className="flex items-center gap-1"><CreditCard className="h-3 w-3" />Online</Badge>;
      case 'cash':
        return <Badge variant="success" className="flex items-center gap-1"><Wallet className="h-3 w-3" />Cash</Badge>;
      default:
        return <Badge variant="secondary">N/A</Badge>;
    }
  };

 const filtered = useMemo(() => {
  // Server handles search; frontend only groups selections returned from server.
  return selections.filter(s => {
    return s.some(tx => {
      let matchesStatus = false;
      const totalPayable = tx.paymentDetails?.totalPayable || 0;

      if (statusFilter === 'unpaid') {
        matchesStatus = totalPayable > 0;
      } else if (statusFilter === 'completed') {
        matchesStatus = totalPayable === 0;
      } else if (statusFilter === 'all') {
        matchesStatus = true;
      } else {
        matchesStatus = tx.paymentStatus === statusFilter;
      }

      const matchesMode = modeFilter === 'all' || tx.paymentMode === modeFilter;

      let matchesDate = true;
      if (fromDate) {
        const txDate = tx.paymentDate ? new Date(tx.paymentDate) : null;
        matchesDate = txDate ? txDate >= new Date(fromDate) : false;
      }
      if (toDate) {
        const txDate = tx.paymentDate ? new Date(tx.paymentDate) : null;
        matchesDate = matchesDate && (txDate ? txDate <= new Date(toDate) : false);
      }

      return matchesStatus && matchesMode && matchesDate;
    });
  });
}, [selections, statusFilter, modeFilter, fromDate, toDate]);

  const totalPages = Math.ceil(filtered.length / rowsPerPage);

const paginatedFiltered = useMemo(() => {
  return filtered.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );
}, [filtered, currentPage]);
  const computeTotal = (s) => {
    // Use backend-calculated total if available
    if (s.paymentDetails) {
      return s.paymentDetails.totalPayable;
    }
    // Fallback to 0 if no payment details
    return 0;
  };

  const stats = {
    total: filtered.length,
    completed: filtered.flat().filter(s => s.paymentStatus === 'completed').length,
    pending: filtered.flat().filter(s => s.paymentStatus === 'pending').length,
    online: filtered.flat().filter(s => s.paymentMode === 'online').length,
    cash: filtered.flat().filter(s => s.paymentMode === 'cash').length,
    totalAmount: filtered.flat().reduce((sum, s) => sum + computeTotal(s), 0)
  };

  const handleExport = () => {
    if (filtered.length === 0) {
      toast.error('No records to export');
      return;
    }
    
    // Flatten grouped records for export
    const allRecords = filtered.flat();
    
    const escape = (value) => {
      if (value == null) return '';
      const str = String(value);
      return `"${str.replace(/"/g, '""')}"`;
    };
    
    const rows = allRecords.map(s => {
      // Calculate days for rent (only when vehicle active and rent has actually started)
      let days = 0;
      if (s.rentStartDate && s.vehicleStatus === 'active') {
        const start = new Date(s.rentStartDate);
        let end = new Date();
        if (s.status === 'inactive' && s.rentPausedDate) {
          end = new Date(s.rentPausedDate);
        }
        const startMidnight = new Date(start.getFullYear(), start.getMonth(), start.getDate());
        const endMidnight = new Date(end.getFullYear(), end.getMonth(), end.getDate());
        days = Math.floor((endMidnight - startMidnight) / (1000 * 60 * 60 * 24)) + 1;
        days = Math.max(1, days);
      }
      
      // Calculate amounts
      const rentPerDay = s.calculatedRent || (() => {
        const slab = s.selectedRentSlab || {};
        return s.planType === 'weekly' ? (slab.weeklyRent || 0) : (slab.rentDay || 0);
      })();
      
      const accidentalCover = s.planType === 'weekly' ? (s.calculatedCover || (s.selectedRentSlab?.accidentalCover || 105)) : 0;
      const adjustment = s.adjustmentAmount || 0;
      const paidAmount = s.paidAmount || 0;
      
      // Calculate deposit due
      let depositDue = 0;
      if (s.paymentType === 'security') {
        depositDue = Math.max(0, (s.securityDeposit || 0) - paidAmount);
      } else {
        depositDue = s.securityDeposit || 0;
      }
      
      // Calculate rent due (adjustment is deducted from rent)
      let rentDue = 0;
      const totalRent = days * rentPerDay;
      if (s.paymentType === 'rent') {
        rentDue = Math.max(0, totalRent - paidAmount - adjustment);
      } else {
        rentDue = Math.max(0, totalRent - adjustment);
      }
      
      const extraAmount = s.extraAmount || 0;
      const totalPayable = depositDue + rentDue + accidentalCover + extraAmount;
      const adjustedPaid = Math.max(0, paidAmount - adjustment);
      
      return [
        s.driverUsername || 'N/A',
        s.driverMobile ? `'${s.driverMobile}'` : 'N/A',
        s.planName || 'N/A',
        s.planType || 'N/A',
       
        s.securityDeposit || 0,
        depositDue,
        adjustedPaid || 0,
        days,
        rentPerDay,
        rentDue,
        accidentalCover,
        extraAmount,
        s.extraReason || '',
        adjustment,
        s.adjustmentReason || '',
        totalPayable,
        s.paymentMode || 'N/A',
        s.paymentMethod || 'N/A',
        s.paymentStatus || 'N/A',
        s.paymentType || 'N/A',
        s.paymentDate ? formatDate(s.paymentDate) : 'N/A',
        s.selectedDate ? formatDate(s.selectedDate) : 'N/A',
        s.rentStartDate ? formatDate(s.rentStartDate) : 'N/A',
        s.rentPausedDate ? formatDate(s.rentPausedDate) : 'N/A',
       
        s.createdAt ? formatDate(s.createdAt) : 'N/A',
        s.updatedAt ? formatDate(s.updatedAt) : 'N/A',
        s._id || 'N/A'
      ].map(escape);
    });
    
    const headers = [
      'Driver Name',
      'Driver Mobile',
      'Plan Name',
      'Plan Type',
      
      'Security Deposit',
      'Deposit Due',
      'Deposit Paid',
      'Rent Days',
      'Rent Per Day',
      'Rent Due',
      'Accidental Cover',
      'Extra Amount',
      'Extra Reason',
      'Adjustment Amount',
      'Adjustment Reason',
      'Total Payable',
      'Payment Mode',
      'Payment Method',
      'Payment Status',
      'Payment Type',
      'Payment Date',
      'Selected Date',
      'Rent Start Date',
      'Rent Paused Date',
     
      'Created At',
      'Updated At',
      'Selection ID'
    ].map(escape);
    
    const csv = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const date = new Date().toISOString().split('T')[0];
    a.download = `driver-payments-${date}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${allRecords.length} payment records successfully`);
  };

  const handleViewDetails = async (driverGroup) => {
    try {
      // Pass the entire group of transactions for this driver
      setSelectedDetail(driverGroup);
      setShowDetailModal(true);
    } catch (e) {
      console.error(e);
      toast.error('Failed to load payment details');
    }
  };

  const handleCollectPayment = (selection) => {
    // Prepare selection data for payment
    const paymentData = {
      ...selection,
      totalPayable: selection.paymentDetails?.totalPayable || 0
    };
    setSelectedPayment(paymentData);
    setShowPaymentModal(true);
  };

  const handlePaymentSuccess = async (response) => {
    console.log('Payment completed, refreshing data...', response);
    toast.success('Payment recorded successfully');
    // Refresh the payments list
    setCurrentPage(1);
    fetchPayments(1);
  };

  const handlePaymentStatusChange = async (selectionId, newStatus) => {
    try {
      const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';
      const token = localStorage.getItem('token');
      
      const res = await fetch(`${API_BASE}/api/driver-plan-selections/${selectionId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ paymentStatus: newStatus })
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to update payment status');
      }
      
      const result = await res.json();
      
      // Update local state with refreshed data
      setSelections(prev => prev.map(group =>
        group.map(s =>
          s._id === selectionId
            ? {
                ...s,
                paymentStatus: result.selection.paymentStatus || newStatus,
                paymentDate: result.selection.paymentDate || s.paymentDate
              }
            : s
        )
      ));
      
      const statusLabels = {
        'pending': 'Pending',
        'completed': 'Completed',
        'failed': 'Failed'
      };
      
      toast.success(`Payment status changed to ${statusLabels[newStatus] || newStatus}`);
    } catch (err) {
      console.error('Payment status change error:', err);
      toast.error(err.message || 'Failed to update payment status');
    }
  };

  const handleStatusChange = async (selectionId, newStatus) => {
    try {
      const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';
      const token = localStorage.getItem('token');
      
      console.log('Updating status:', { selectionId, newStatus });
      
      const res = await fetch(`${API_BASE}/api/driver-plan-selections/${selectionId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to update status');
      }
      
      const data = await res.json();
      console.log('Status updated successfully:', data);
      
      // Update local state
      setSelections(prev => prev.map(s => 
        s._id === selectionId ? { ...s, status: newStatus } : s
      ));
      
      const message = newStatus === 'active' 
        ? '✓ Plan activated - Daily rent calculation resumed!' 
        : '✕ Plan deactivated - Daily rent calculation stopped!';
      toast.success(message, { duration: 3000 });
      setOpenDropdown(null);
      
      // Reload selections to get updated data
      setTimeout(() => loadSelections(), 500);
    } catch (e) {
      console.error('Status change error:', e);
      toast.error(e.message || 'Failed to update status');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }


  return (
    <div className="flex flex-col gap-6 w-full">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isManager ? 'My Drivers Payment Records' : 'Driver Payments'}
          </h1>
          <p className="text-gray-600">
            {isManager 
              ? `Viewing payment records for drivers assigned to you (${user?.name})` 
              : 'See who paid for driver plan selections'}
          </p>
        </div>
        <PermissionGuard permission={PERMISSIONS.REPORTS_EXPORT}>
          <button type="button" onClick={handleExport} className="btn btn-secondary mt-4 sm:mt-0 flex items-center gap-2">
            <Download className="h-4 w-4" />
            Export CSV
          </button>
        </PermissionGuard>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Records</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
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
                <p className="text-sm text-gray-600">Completed</p>
                <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
                <p className="text-xs text-gray-500">Pending: {stats.pending}</p>
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
                <p className="text-sm font-semibold text-gray-900">Online: {stats.online}</p>
                <p className="text-sm font-semibold text-gray-900">Cash: {stats.cash}</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-lg">
                <Wallet className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Payment</p>
                <p className="text-2xl font-bold text-gray-900">₹{stats.totalAmount.toLocaleString('en-IN')}</p>
              </div>
              <div className="p-3 bg-yellow-100 rounded-lg">
                <IndianRupee className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
{/* Search Input */}
<div>


  <div className="relative w-full">
    <Search
      className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none"
    />

    <input
      type="text"
      placeholder="Search by driver or plan..."
      value={searchTerm}
      onChange={(e) => setSearchTerm(e.target.value)}
      onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
      className="
        w-full pl-10 pr-3 py-2
        border border-gray-300 rounded-md 
        text-sm focus:outline-none 
        focus:ring-2 focus:ring-blue-500
      "
    />
  </div>
</div>


      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-7 gap-4 items-end">
            {/* From Date */}
            <div>
              <label className="block text-xs text-gray-500 mb-1">From Date</label>
              <input
                type="date"
                value={fromDate}
                onChange={e => setFromDate(e.target.value)}
                className="input w-full"
              />
            </div>
            {/* To Date */}
            <div>
              <label className="block text-xs text-gray-500 mb-1">To Date</label>
              <input
                type="date"
                value={toDate}
                onChange={e => setToDate(e.target.value)}
                className="input w-full"
              />
            </div>
            {/* Status Filter */}
            <div>
              <label className="block text-xs text-gray-500 mb-1">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="input w-full"
              >
                <option value="all">All Status</option>
                <option value="completed">Completed</option>
                <option value="unpaid">Unpaid</option>
                <option value="pending">Pending</option>
                {/* <option value="failed">Failed</option> */}
              </select>
            </div>
            {/* Mode Filter */}
            <div>
              <label className="block text-xs text-gray-500 mb-1">Mode</label>
              <select
                value={modeFilter}
                onChange={(e) => setModeFilter(e.target.value)}
                className="input w-full"
              >
                <option value="all">All Modes</option>
                <option value="online">Online</option>
                <option value="cash">Cash</option>
              </select>
            </div>
            {/* Manager Filter Dropdown - Only shown for non-manager users */}
            {!isManager && (
              <div>
                <label className="block text-xs text-gray-500 mb-1">Manager</label>
                <select
                  className="input w-full"
                  value={selectedManagers['filter'] || ''}
                  onChange={e => {
                    const value = e.target.value;
                    setSelectedManagers(prev => ({ ...prev, filter: value }));
                  }}
                >
                  <option value="">All Managers</option>
                  {managers.map(mgr => (
                    <option key={mgr._id} value={mgr._id}>{mgr.name}</option>
                  ))}
                </select>
              </div>
            )}
            {/* Clear Filters Button */}
            <div>
              <button type="button"
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('all');
                  setModeFilter('all');
                  setFromDate('');
                  setToDate('');
                  setSelectedManagers(prev => ({ ...prev, filter: '' }));
                  setCurrentPage(1);
                }}
                className="btn btn-secondary w-full"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </CardContent>
      </Card>


      <Card className="w-full">
        <CardHeader>
          <CardTitle>Driver Payment Records</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
      <div className="overflow-x-auto">
            <Table className="w-full">
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-gray-500">No records found</TableCell>
                  </TableRow>
                ) : (
                  paginatedFiltered.map((group, idx) => {
                    const first = group[0];
                    return (
                      <TableRow key={first.driverMobile || first.driverUsername || idx}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                              <Users className="h-5 w-5 text-primary-600" />
                            </div>
                            <div>
                              <p className="font-semibold text-gray-900">{first.driverUsername || 'N/A'}</p>
                              <p className="text-xs text-gray-500 flex items-center gap-1"><Phone className="h-3 w-3" />{first.driverMobile}</p>
                              {/* <p className="text-[10px] text-gray-400">ID: {first._id.slice(-6)}</p> */}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell colSpan={8}>
                          {/* Nested table for transactions */}
                          <div className="">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Plan</TableHead>
                                  <TableHead>Deposite Amount</TableHead>
                                  <TableHead>Total Payable Amount</TableHead>
                                  <TableHead>Total Paid Amount</TableHead>
                                  <TableHead>Daily Rent</TableHead>
                                      <TableHead>Transaction</TableHead>
                                  <TableHead>Payment</TableHead>
                                  <TableHead>Payment Status</TableHead>
                                 
                                  <TableHead>Actions</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {group.map(s => (
                                  <TableRow key={s._id}>
                                    <TableCell>
                                      <div className="space-y-1">
                                        <p className="font-medium">{s.planName}</p>
                                        <p className="text-xs text-gray-500 capitalize">Type: {s.planType}</p>
                                        <p className="text-xs text-gray-500">Selected: {s.selectedDate ? formatDate(s.selectedDate) : 'N/A'}</p>
                                      </div>
                                    </TableCell>
                                    <TableCell>
                                      <p className='text-xs'>Deposite Amount: ₹{(s.securityDeposit||0).toLocaleString('en-IN')}</p>
                                      {/* <p className="font-semibold">₹{(s.securityDeposit||0).toLocaleString('en-IN')}</p> */}
                                      {/* Show deposit paid if available */}
                                      {((s.depositPaid !== undefined && s.depositPaid > 0) || (s.paymentType === 'security' && s.paidAmount !== null && s.paidAmount !== undefined)) && (
                                        <div className="mt-1 pt-1 border-t border-gray-200">
                                          <p className="text-xs font-semibold text-green-600">
                                            Deposit Paid: ₹{(s.depositPaid !== undefined ? s.depositPaid : ((s.paidAmount || 0) - (s.adjustmentAmount || 0))).toLocaleString('en-IN')}
                                          </p>
                                          {s.adjustmentAmount > 0 && (
                                            <p className="text-xs font-semibold text-yellow-600">Adjustment Deducted: ₹{s.adjustmentAmount.toLocaleString('en-IN')}</p>
                                          )}
                                        </div>
                                      )}
                                    </TableCell>
                                    <TableCell>
                                        <div className="space-y-1">
                                          <p className="font-bold text-blue-600">
                                            ₹{(s.paymentDetails?.totalPayable || 0).toLocaleString('en-IN')}
                                          </p>
                                          {/* <p className="text-[11px] text-gray-500">
                                            Remaining Due = (Rent Due + Accidental Cover + Extra Amount)
                                          </p> */}
                                          <div className="text-[10px] text-gray-500 mt-1">
                                            <div>Deposit Due: ₹{(s.paymentDetails?.depositDue || 0).toLocaleString('en-IN')}</div>
                                            <div>Rent Due: ₹{(s.paymentDetails?.rentDue || 0).toLocaleString('en-IN')}</div>
                                            <div>Accidental Cover: ₹{(s.paymentDetails?.accidentalCover || 0).toLocaleString('en-IN')}</div>
                                            <div>Extra Amount: ₹{(s.paymentDetails?.extraAmount || 0).toLocaleString('en-IN')}</div>
                                            <div>Paid: ₹{(s.paymentDetails?.paidAmount || 0).toLocaleString('en-IN')}</div>
                                          </div>
                                          {/* Show all due calculated amounts below */}
                                          <div className="mt-1">
                                           
                                            {/* Extra Amount Due and Reason */}
                                            {s.extraAmount > 0 && (
                                              <p className="text-xs text-yellow-700">Extra Amount: ₹{s.extraAmount.toLocaleString('en-IN')}</p>
                                            )}
                                            {/* {s.extraAmount > 0 && s.extraReason && (
                                              <p className="text-xs text-gray-700">Reason: {s.extraReason}</p>
                                            )} */}
                                            {/* Adjustment Amount and Reason */}
                                            {s.adjustmentAmount > 0 && (
                                              <p className="text-xs text-yellow-700 mt-1">Adjustment Amount: ₹{s.adjustmentAmount.toLocaleString('en-IN')}</p>
                                            )}
                                            {/* {s.adjustmentAmount > 0 && s.adjustmentReason && (
                                              <p className="text-xs text-gray-700">Reason: {s.adjustmentReason}</p>
                                            )} */}
                                          </div>
                                          {/* Show rent paid if available */}
                                          {((s.rentPaid !== undefined && s.rentPaid > 0) || (s.paymentType === 'rent' && s.paidAmount !== null && s.paidAmount !== undefined)) && (
                                            <div className="mt-1 pt-1 border-t border-gray-200">
                                              <p className="text-xs font-semibold text-green-600">
                                                Rent Paid: ₹{(s.rentPaid !== undefined ? s.rentPaid : ((s.paidAmount || 0) - (s.adjustmentAmount || 0))).toLocaleString('en-IN')}
                                              </p>
                                            </div>
                                          )}
                                          {/* Show deposit paid if available */}
                                          {s.depositPaid !== undefined && s.depositPaid > 0 && (
                                            <div className="mt-1 pt-1 border-t border-gray-200">
                                              <p className="text-xs font-semibold text-green-600">
                                                Deposit Paid: ₹{s.depositPaid.toLocaleString('en-IN')}
                                              </p>
                                            </div>
                                          )}
                                          {/* Show all due amounts, extra amount, and reason */}
                                        
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                      <div className="space-y-1">
                                        {(() => {
                                          // Calculate total paid amount (driver + admin) for this driver across all transactions
                                          const totalPaidByDriver = group.reduce((sum, transaction) => {
                                            return sum + (transaction.paidAmount || 0);
                                          }, 0);
                                          
                                          const totalPaidByAdmin = group.reduce((sum, transaction) => {
                                            return sum + (transaction.adminPaidAmount || 0);
                                          }, 0);
                                          
                                          const totalPaid = totalPaidByDriver + totalPaidByAdmin;
                                          
                                          return (
                                            <div>
                                              <p className="font-bold text-green-600 text-lg">
                                                ₹{totalPaid.toLocaleString('en-IN')}
                                              </p>
                                              {(totalPaidByDriver > 0 || totalPaidByAdmin > 0) && (
                                                <div className="text-[10px] text-gray-500 mt-1 space-y-0.5">
                                                  {totalPaidByDriver > 0 && (
                                                    <p>Driver: ₹{totalPaidByDriver.toLocaleString('en-IN')}</p>
                                                  )}
                                                  {totalPaidByAdmin > 0 && (
                                                    <p>Admin: ₹{totalPaidByAdmin.toLocaleString('en-IN')}</p>
                                                  )}
                                                </div>
                                              )}
                                            </div>
                                          );
                                        })()}
                                      </div>
                                    </TableCell>
                                    <TableCell>
                                      {s.rentStartDate && s.vehicleStatus === 'active' ? (
                                        <div className="space-y-1">
                                          <p className="text-xs text-gray-600">
                                            <span className="font-semibold">Days:</span> {s.paymentDetails?.days || 0}
                                          </p>
                                          <p className="text-xs text-gray-600">
                                            <span className="font-semibold">Rent/Day:</span> ₹{(s.paymentDetails?.rentPerDay || 0).toLocaleString('en-IN')}
                                          </p>
                                          {/* Vehicle Status Badge */}
                                          {s.vehicleStatus && (
                                            <div className="mt-1">
                                              {s.vehicleStatus === 'active' ? (
                                                <Badge variant="success" className="text-xs">Car: Active</Badge>
                                              ) : (
                                                <Badge variant="danger" className="text-xs">Car: Inactive</Badge>
                                              )}
                                            </div>
                                          )}
                                          {/* Plan Status Badge */}
                                          {s.status && (
                                            <div className="mt-1">
                                              {s.status === 'active' ? (
                                                <Badge variant="success" className="text-xs">Rent: Counting</Badge>
                                              ) : (
                                                <Badge variant="danger" className="text-xs">Rent: Stopped</Badge>
                                              )}
                                            </div>
                                          )}
                                          {/* Deposit paid/due status */}
                                          {((s.securityDeposit || 0) > 0) && (
                                            <p className="text-xs">
                                              <span className="font-semibold">Deposit: </span>
                                              {(s.paymentDetails?.depositDue || 0) === 0 ? (
                                                <span className="text-green-600 font-semibold">Paid ₹{(s.securityDeposit || 0).toLocaleString('en-IN')}</span>
                                              ) : (
                                                <span className="text-orange-600 font-semibold">Due ₹{(s.paymentDetails?.depositDue || 0).toLocaleString('en-IN')}</span>
                                              )}
                                            </p>
                                          )}

                                         

                                          <div className="flex items-center gap-4 ">
                                                <p className="text-xs font-semibold text-yellow-700 whitespace-nowrap">Add Adjustment :</p>
                                                <input
                                                  type="number"
                                                  className="border border-gray-300 rounded-md px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-yellow-500 w-24"
                                                  placeholder="Amount"
                                                  value={adjustmentInputs[s._id]?.amount ?? ''}
                                                  onChange={e => setAdjustmentInputs(prev => ({
                                                    ...prev,
                                                    [s._id]: { ...prev[s._id], amount: e.target.value }
                                                  }))}
                                                  disabled={adjustmentInputs[s._id]?.loading}
                                                />
                                                <input
                                                  type="text"
                                                  className="border border-gray-300 rounded-md px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-yellow-500 w-40"
                                                  placeholder="Enter reason..."
                                                  value={adjustmentInputs[s._id]?.reason ?? ''}
                                                  onChange={e => setAdjustmentInputs(prev => ({
                                                    ...prev,
                                                    [s._id]: { ...prev[s._id], reason: e.target.value }
                                                  }))}
                                                  disabled={adjustmentInputs[s._id]?.loading}
                                                />
                                                <button
                                                  className="bg-yellow-600 text-white text-xs px-4 py-1.5 rounded-md hover:bg-yellow-700 transition disabled:opacity-60"
                                                  onClick={() => handleSaveAdjustment(s._id)}
                                                  disabled={adjustmentInputs[s._id]?.loading}
                                                >
                                                  {adjustmentInputs[s._id]?.loading ? 'saving...' : 'Save'}
                                                </button>
                                              </div>

                                              <div className="flex items-center gap-4">
                                                <p className="text-xs font-semibold text-yellow-700 whitespace-nowrap">Extra Amount :</p>
                                                <input
                                                  type="number"
                                                  className="border border-gray-300 rounded-md px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-yellow-500 w-24"
                                                  placeholder="Amount"
                                                  value={extraInputs[s._id]?.amount ?? ''}
                                                  onChange={e => setExtraInputs(prev => ({
                                                    ...prev,
                                                    [s._id]: { ...prev[s._id], amount: e.target.value }
                                                  }))}
                                                  disabled={extraInputs[s._id]?.loading}
                                                />
                                                <input
                                                  type="text"
                                                  className="border border-gray-300 rounded-md px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-yellow-500 w-40"
                                                  placeholder="Enter reason..."
                                                  value={extraInputs[s._id]?.reason ?? ''}
                                                  onChange={e => setExtraInputs(prev => ({
                                                    ...prev,
                                                    [s._id]: { ...prev[s._id], reason: e.target.value }
                                                  }))}
                                                  disabled={extraInputs[s._id]?.loading}
                                                />
                                                <button
                                                  className="bg-yellow-600 text-white text-xs px-4 py-1.5 rounded-md hover:bg-yellow-700 transition disabled:opacity-60"
                                                  onClick={() => handleSaveExtra(s._id)}
                                                  disabled={extraInputs[s._id]?.loading}
                                                >
                                                  {extraInputs[s._id]?.loading ? 'Saving...' : 'Save'}
                                                </button>
                                              </div>
                                        </div>
                                      ) : (
                                        <div className="text-xs text-gray-500">Not started</div>
                                      )}
                                       {/* Admin Paid Amount Input - Always show for all payment methods */}
                                       <div className="mt-2 pt-2 border-t border-gray-200">
                                            <div className="flex flex-col gap-2">
                                              <div className="flex items-center gap-2">
                                                <label className="text-xs font-semibold text-blue-700 whitespace-nowrap">Admin Paid:</label>
                                                <input
                                                  type="number"
                                                  className="border border-gray-300 rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 w-24"
                                                  placeholder="Amount"
                                                  value={adminPaidInputs[s._id]?.amount ?? ''}
                                                  onChange={e => setAdminPaidInputs(prev => ({
                                                    ...prev,
                                                    [s._id]: { ...prev[s._id], amount: e.target.value }
                                                  }))}
                                                  disabled={adminPaidInputs[s._id]?.loading}
                                                />
                                              <select
  className="w-36 border border-gray-300 rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
  value={adminPaidInputs[s._id]?.paymentType || 'rent'}
  onChange={e => {
    const newType = e.target.value;

    setAdminPaidInputs(prev => {
      const current = prev[s._id] || {};

      // Auto-fill amount when "Total Payable" is selected
      if (newType === 'total' && s.paymentDetails?.totalPayable) {
        return {
          ...prev,
          [s._id]: {
            ...current,
            paymentType: newType,
            amount: s.paymentDetails.totalPayable.toString(),
          },
        };
      }

      return {
        ...prev,
        [s._id]: {
          ...current,
          paymentType: newType,
        },
      };
    });
  }}
  disabled={adminPaidInputs[s._id]?.loading}
>
  <option value="rent">Rent</option>
  <option value="security">Deposit</option>
  <option value="total">Total Payable</option>
</select>

                                                <button
                                                  className="bg-blue-600 text-white text-xs px-3 py-1 rounded-md hover:bg-blue-700 transition disabled:opacity-60"
                                                  onClick={() => handleSaveAdminPaid(s._id)}
                                                  disabled={adminPaidInputs[s._id]?.loading}
                                                >
                                                  {adminPaidInputs[s._id]?.loading ? 'Saving...' : 'Save'}
                                                </button>
                                              </div>
                                              {s.adminPaidAmount > 0 && (
                                                <p className="text-xs text-green-600 font-semibold">
                                                  Total Admin Paid: ₹{s.adminPaidAmount.toLocaleString('en-IN')}
                                                </p>
                                              )}
                                            </div>
                                          </div>
                                    </TableCell>
                                      <TableCell>
                                      <div className="flex flex-col gap-2">
                                        <button
                                          onClick={() => handleViewDetails(group)}
                                          className="text-primary-600 hover:text-primary-700 flex items-center gap-1 text-sm font-medium border border-primary-200 rounded px-2 py-1"
                                          title="View all transactions"
                                        >
                                          <Eye className="h-4 w-4" />
                                          See Transaction
                                        </button>
                                        {s.paymentDetails?.totalPayable > 0 && (
                                          <button
                                            onClick={() => handleCollectPayment(s)}
                                            className="text-blue-600 hover:text-blue-700 flex items-center gap-1 text-sm font-medium border border-blue-200 rounded px-2 py-1 bg-blue-50"
                                            title="Collect payment online via ZWITCH"
                                          >
                                            <CreditCard className="h-4 w-4" />
                                            Collect Online
                                          </button>
                                        )}
                                      </div>
                                    </TableCell>
                                    <TableCell>
                                      <div className="space-y-1">
                                        <div>{getModeBadge(s.paymentMode)}</div>
                                        <p className="text-xs text-gray-500">Method: {s.paymentMethod || 'N/A'}</p>
                                        {(() => {
                                          // Check if any payment has been made (driver, admin, or online)
                                          const driverPaid = s.paidAmount || 0;
                                          const adminPaid = s.adminPaidAmount || 0;
                                          const totalPaid = driverPaid + adminPaid;
                                          
                                          if (totalPaid > 0) {
                                            // Payment has been made
                                            return (
                                              <p className="text-xs text-green-600 font-semibold">
                                                Paid: ₹{totalPaid.toLocaleString('en-IN')}
                                              </p>
                                            );
                                          } else {
                                            // No payment made yet
                                            return (
                                              <p className="text-xs text-gray-500">Date: {s.paymentDate ? formatDate(s.paymentDate) : 'Not paid yet'}</p>
                                            );
                                          }
                                        })()}
                                       
                                      </div>
                                    </TableCell>
                                    <TableCell>
                                      <select
                                        value={s.paymentStatus || 'pending'}
                                        onChange={(e) => handlePaymentStatusChange(s._id, e.target.value)}
                                        className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                                      >
                                        <option value="pending">Pending</option>
                                        <option value="completed">Completed</option>
                                        <option value="failed">Failed</option>
                                      </select>
                                    </TableCell>
                                    
                                    <TableCell>
                                      <div className="flex gap-2">
                                        {/* <button
                                          onClick={() => handleViewDetails(group)}
                                          className="text-primary-600 hover:text-primary-700 flex items-center gap-1 text-sm font-medium border border-primary-200 rounded px-2 py-1"
                                          title="View all transactions"
                                        >
                                          <Eye className="h-4 w-4" />
                                          View
                                        </button> */}
                                        <button type="button"
                                          onClick={() => handleDelete(s._id)}
                                          className="text-red-600 hover:text-red-700 flex items-center gap-1 text-sm font-medium border border-red-200 rounded px-2 py-1"
                                          title="Delete payment record"
                                        >
                                          🗑 Delete
                                        </button>
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
        {filtered.length > rowsPerPage && (
  <div className="flex items-center justify-between px-4 py-3 border-t text-sm">
    <div className="text-gray-600">
      Showing {(currentPage - 1) * rowsPerPage + 1} –
      {Math.min(currentPage * rowsPerPage, filtered.length)} of {filtered.length}
    </div>

    <div className="flex items-center gap-2">
      <button type="button"
        disabled={currentPage === 1}
        onClick={() => setCurrentPage(p => p - 1)}
        className="px-3 py-1 border rounded disabled:opacity-50"
      >
        Prev
      </button>

      <span className="px-2">
        Page {currentPage} of {totalPages}
      </span>

      <button type="button"
        disabled={currentPage === totalPages}
        onClick={() => setCurrentPage(p => p + 1)}
        className="px-3 py-1 border rounded disabled:opacity-50"
      >
        Next
      </button>
    </div>
  </div>
)}

      </Card>
      {/* Payment Detail Modal - All Transactions */}
      {selectedDetail && showDetailModal && Array.isArray(selectedDetail) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-gray-200 flex-shrink-0">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Transaction History</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    {selectedDetail[0]?.driverUsername} - {selectedDetail[0]?.driverMobile}
                  </p>
                </div>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ✕
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              {/* Summary Cards */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-xs text-gray-600">Total Transactions</p>
                  <p className="text-2xl font-bold text-blue-600">{selectedDetail.length}</p>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <p className="text-xs text-gray-600">Total Paid</p>
                  <p className="text-2xl font-bold text-green-600">
                    ₹{selectedDetail.reduce((sum, t) => sum + (t.paidAmount || 0), 0).toLocaleString('en-IN')}
                  </p>
                </div>
                <div className="bg-orange-50 rounded-lg p-4">
                  <p className="text-xs text-gray-600">Total Due</p>
                  <p className="text-2xl font-bold text-orange-600">
                    ₹{selectedDetail.reduce((sum, t) => sum + (t.paymentDetails?.totalPayable || 0), 0).toLocaleString('en-IN')}
                  </p>
                </div>
              </div>

              {/* Transaction List */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-700">All Transactions</h3>
                {selectedDetail.map((transaction, index) => (
                  <div key={transaction._id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="font-semibold text-gray-900">Transaction #{index + 1}</h4>
                        <p className="text-xs text-gray-500">ID: {transaction._id}</p>
                      </div>
                      <div className="text-right">
                        {getStatusBadge(transaction.paymentStatus)}
                      </div>
                    </div>

                    {/* Transaction Details Grid */}
                    <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                      <div>
                        <span className="text-gray-600">Plan:</span>
                        <span className="ml-2 font-medium">{transaction.planName}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Type:</span>
                        <span className="ml-2 font-medium capitalize">{transaction.planType}</span>
                      </div>
                      
                      <div>
                        <span className="text-gray-600">Security Deposit:</span>
                        <span className="ml-2 font-medium">₹{(transaction.securityDeposit || 0).toLocaleString('en-IN')}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Payment Type:</span>
                        <span className="ml-2 font-medium capitalize">{transaction.paymentType || 'N/A'}</span>
                      </div>

                      {transaction.rentStartDate && transaction.vehicleStatus === 'active' && (
                        <>
                          <div>
                            <span className="text-gray-600">Rent Start:</span>
                            <span className="ml-2 font-medium">{formatDate(transaction.rentStartDate)}</span>
                          </div>
                          <div>
                            <span className="text-gray-600">Days:</span>
                            <span className="ml-2 font-medium">{transaction.paymentDetails?.days || 0}</span>
                          </div>
                          <div>
                            <span className="text-gray-600">Rent/Day:</span>
                            <span className="ml-2 font-medium">₹{(transaction.paymentDetails?.rentPerDay || 0).toLocaleString('en-IN')}</span>
                          </div>
                        </>
                      )}

                      <div>
                        <span className="text-gray-600">Payment Mode:</span>
                        <span className="ml-2">{getModeBadge(transaction.paymentMode)}</span>
                      </div>

                      <div>
                        <span className="text-gray-600">Payment Date:</span>
                        <span className="ml-2 font-medium">
                          {transaction.paymentDate ? formatDate(transaction.paymentDate) : 'Not paid'}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">Selected Date:</span>
                        <span className="ml-2 font-medium">
                          {transaction.selectedDate ? formatDate(transaction.selectedDate) : 'N/A'}
                        </span>
                      </div>
                    </div>

                    {/* Payment Breakdown */}
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Deposit Due:</span>
                          <span className="font-semibold">₹{(transaction.paymentDetails?.depositDue || 0).toLocaleString('en-IN')}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Rent Due:</span>
                          <span className="font-semibold">₹{(transaction.paymentDetails?.rentDue || 0).toLocaleString('en-IN')}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Accidental Cover:</span>
                          <span className="font-semibold">₹{(transaction.paymentDetails?.accidentalCover || 0).toLocaleString('en-IN')}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Extra Amount:</span>
                          <span className="font-semibold text-yellow-600">₹{(transaction.extraAmount || 0).toLocaleString('en-IN')}</span>
                        </div>
                        {transaction.adjustmentAmount > 0 && (
                          <div className="flex justify-between col-span-2">
                            <span className="text-gray-600">Adjustment (Discount):</span>
                            <span className="font-semibold text-green-600">-₹{transaction.adjustmentAmount.toLocaleString('en-IN')}</span>
                          </div>
                        )}
                      </div>

                      {/* Extra Amounts - Show all individual entries */}
                      {(transaction.extraAmounts?.length > 0 || (transaction.extraAmount > 0 && transaction.extraReason)) && (
                        <div className="mt-2 space-y-2">
                          <p className="text-xs font-semibold text-yellow-800">Extra Amounts Added:</p>
                          
                          {/* Show new array format if available */}
                          {transaction.extraAmounts?.map((extra, idx) => (
                            <div key={idx} className="p-3 bg-yellow-50 border border-yellow-200 rounded text-xs">
                              <div className="flex justify-between items-start mb-1">
                                <span className="font-semibold text-yellow-800">Amount #{idx + 1}:</span>
                                <span className="text-yellow-600 font-medium">₹{extra.amount.toLocaleString('en-IN')}</span>
                              </div>
                              <div className="text-yellow-700 mb-1">
                                <span className="font-medium">Reason:</span> {extra.reason || 'No reason provided'}
                              </div>
                              <div className="text-yellow-600 text-[10px]">
                                <span className="font-medium">Date:</span> {extra.date ? formatDate(extra.date) : 'N/A'}
                              </div>
                            </div>
                          ))}
                          
                          {/* Fallback: Show old single format if no array but has values */}
                          {(!transaction.extraAmounts || transaction.extraAmounts.length === 0) && transaction.extraAmount > 0 && transaction.extraReason && (
                            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded text-xs">
                              <div className="flex justify-between items-start mb-1">
                                <span className="font-semibold text-yellow-800">Extra Amount:</span>
                                <span className="text-yellow-600 font-medium">₹{transaction.extraAmount.toLocaleString('en-IN')}</span>
                              </div>
                              <div className="text-yellow-700 mb-1">
                                <span className="font-medium">Reason:</span> {transaction.extraReason}
                              </div>
                              <div className="text-yellow-600 text-[10px]">
                                <span className="font-medium">Last Updated:</span> {transaction.updatedAt ? formatDate(transaction.updatedAt) : 'N/A'}
                              </div>
                            </div>
                          )}
                          
                          <div className="text-xs font-semibold text-yellow-800 pt-1 border-t border-yellow-300">
                            Total Extra Amount: ₹{(transaction.extraAmount || 0).toLocaleString('en-IN')}
                          </div>
                        </div>
                      )}
                      
                      {/* Adjustments - Show all individual entries */}
                      {(transaction.adjustments?.length > 0 || (transaction.adjustmentAmount > 0 && transaction.adjustmentReason)) && (
                        <div className="mt-2 space-y-2">
                          <p className="text-xs font-semibold text-green-800">Adjustments (Discounts) Applied:</p>
                          
                          {/* Show new array format if available */}
                          {transaction.adjustments?.map((adj, idx) => (
                            <div key={idx} className="p-3 bg-green-50 border border-green-200 rounded text-xs">
                              <div className="flex justify-between items-start mb-1">
                                <span className="font-semibold text-green-800">Adjustment #{idx + 1}:</span>
                                <span className="text-green-600 font-medium">-₹{adj.amount.toLocaleString('en-IN')}</span>
                              </div>
                              <div className="text-green-700 mb-1">
                                <span className="font-medium">Reason:</span> {adj.reason || 'No reason provided'}
                              </div>
                              <div className="text-green-600 text-[10px]">
                                <span className="font-medium">Date:</span> {adj.date ? formatDate(adj.date) : 'N/A'}
                              </div>
                            </div>
                          ))}
                          
                          {/* Fallback: Show old single format if no array but has values */}
                          {(!transaction.adjustments || transaction.adjustments.length === 0) && transaction.adjustmentAmount > 0 && transaction.adjustmentReason && (
                            <div className="p-3 bg-green-50 border border-green-200 rounded text-xs">
                              <div className="flex justify-between items-start mb-1">
                                <span className="font-semibold text-green-800">Adjustment (Discount):</span>
                                <span className="text-green-600 font-medium">-₹{transaction.adjustmentAmount.toLocaleString('en-IN')}</span>
                              </div>
                              <div className="text-green-700 mb-1">
                                <span className="font-medium">Reason:</span> {transaction.adjustmentReason}
                              </div>
                              <div className="text-green-600 text-[10px]">
                                <span className="font-medium">Last Updated:</span> {transaction.updatedAt ? formatDate(transaction.updatedAt) : 'N/A'}
                              </div>
                            </div>
                          )}
                          
                          <div className="text-xs font-semibold text-green-800 pt-1 border-t border-green-300">
                            Total Adjustment: -₹{(transaction.adjustmentAmount || 0).toLocaleString('en-IN')}
                          </div>
                        </div>
                      )}

                      {/* Payment Records Section */}
                      <div className="mt-3 pt-3 border-t border-gray-300">
                        <p className="text-sm font-semibold text-gray-800 mb-2">Payment Records:</p>
                        <div className="space-y-2">
                          {/* Driver Payment Record */}
                          {transaction.paidAmount > 0 && transaction.paymentDate && (
                            <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                              <div className="flex justify-between items-start mb-2">
                                <div>
                                  <span className="text-xs font-semibold text-blue-800">Driver Payment</span>
                                  <div className="text-[10px] text-blue-600 mt-0.5">
                                    {transaction.paymentDate ? new Date(transaction.paymentDate).toLocaleString('en-IN', {
                                      dateStyle: 'medium',
                                      timeStyle: 'short'
                                    }) : 'N/A'}
                                  </div>
                                </div>
                                <span className="text-lg font-bold text-blue-700">₹{(transaction.paidAmount || 0).toLocaleString('en-IN')}</span>
                              </div>
                              <div className="grid grid-cols-2 gap-2 text-xs">
                                <div>
                                  <span className="text-blue-600">Type:</span>
                                  <span className="ml-1 font-medium capitalize">{transaction.paymentType || 'N/A'}</span>
                                </div>
                                <div>
                                  <span className="text-blue-600">Mode:</span>
                                  <span className="ml-1">{getModeBadge(transaction.paymentMode)}</span>
                                </div>
                                <div className="col-span-2">
                                  <span className="text-blue-600">Method:</span>
                                  <span className="ml-1 font-medium">{transaction.paymentMethod || 'N/A'}</span>
                                </div>
                                <div className="col-span-2">
                                  <span className="text-blue-600">Paid By:</span>
                                  <span className="ml-1 font-semibold">Driver</span>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Admin Payment Record(s) - Show all admin payments dynamically */}
                          {transaction.adminPayments && transaction.adminPayments.length > 0 ? (
                            <div className="space-y-2">
                              {transaction.adminPayments.map((adminPayment, idx) => (
                                <div key={idx} className="p-3 bg-purple-50 border border-purple-200 rounded-md">
                                  <div className="flex justify-between items-start mb-2">
                                    <div>
                                      <span className="text-xs font-semibold text-purple-800">
                                        Admin Payment #{idx + 1}
                                      </span>
                                      <div className="text-[10px] text-purple-600 mt-0.5">
                                        {adminPayment.date ? new Date(adminPayment.date).toLocaleString('en-IN', {
                                          dateStyle: 'medium',
                                          timeStyle: 'short'
                                        }) : 'N/A'}
                                      </div>
                                    </div>
                                    <span className="text-lg font-bold text-purple-700">
                                      ₹{(adminPayment.amount || 0).toLocaleString('en-IN')}
                                    </span>
                                  </div>
                                  <div className="grid grid-cols-2 gap-2 text-xs">
                                    <div className="col-span-2">
                                      <span className="text-purple-600">Payment Type:</span>
                                      <span className="ml-1 font-medium capitalize">
                                        {adminPayment.type === 'security' ? 'Deposit' : adminPayment.type === 'total' ? 'Total Payable' : 'Rent'}
                                      </span>
                                    </div>
                                    <div className="col-span-2">
                                      <span className="text-purple-600">Mode:</span>
                                      <span className="ml-1 font-medium">Cash/Manual Entry</span>
                                    </div>
                                    <div className="col-span-2">
                                      <span className="text-purple-600">Paid By:</span>
                                      <span className="ml-1 font-semibold">Admin</span>
                                    </div>
                                  </div>
                                  {(adminPayment.depositPaid > 0 || adminPayment.rentPaid > 0 || adminPayment.extraAmountPaid > 0 || adminPayment.accidentalCoverPaid > 0) && (
                                    <div className="mt-2 pt-2 border-t border-purple-200 text-xs space-y-1">
                                      {adminPayment.depositPaid > 0 && (
                                        <div className="text-purple-700">
                                          Deposit Paid: ₹{adminPayment.depositPaid.toLocaleString('en-IN')}
                                        </div>
                                      )}
                                      {adminPayment.rentPaid > 0 && (
                                        <div className="text-purple-700">
                                          Rent Paid: ₹{adminPayment.rentPaid.toLocaleString('en-IN')}
                                        </div>
                                      )}
                                      {adminPayment.accidentalCoverPaid > 0 && (
                                        <div className="text-purple-700">
                                          Accidental Cover Paid: ₹{adminPayment.accidentalCoverPaid.toLocaleString('en-IN')}
                                        </div>
                                      )}
                                      {adminPayment.extraAmountPaid > 0 && (
                                        <div className="text-purple-700">
                                          Extra Amount Paid: ₹{adminPayment.extraAmountPaid.toLocaleString('en-IN')}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              ))}
                              <div className="text-xs font-semibold text-purple-800 pt-1 border-t border-purple-300 bg-purple-100 p-2 rounded">
                                Total Admin Paid: ₹{(transaction.adminPaidAmount || 0).toLocaleString('en-IN')}
                              </div>
                            </div>
                          ) : transaction.adminPaidAmount > 0 ? (
                            // Legacy Admin Payment - Only show if no adminPayments array but adminPaidAmount exists
                            <div className="p-3 bg-purple-50 border border-purple-200 rounded-md">
                              <div className="flex justify-between items-start mb-2">
                                <div>
                                  <span className="text-xs font-semibold text-purple-800">Admin Payment (Legacy)</span>
                                  <div className="text-[10px] text-purple-600 mt-0.5">
                                    {transaction.updatedAt ? new Date(transaction.updatedAt).toLocaleString('en-IN', {
                                      dateStyle: 'medium',
                                      timeStyle: 'short'
                                    }) : 'N/A'}
                                  </div>
                                </div>
                                <span className="text-lg font-bold text-purple-700">₹{(transaction.adminPaidAmount || 0).toLocaleString('en-IN')}</span>
                              </div>
                              <div className="grid grid-cols-2 gap-2 text-xs">
                                <div className="col-span-2">
                                  <span className="text-purple-600">Mode:</span>
                                  <span className="ml-1 font-medium">Cash/Manual Entry</span>
                                </div>
                                <div className="col-span-2">
                                  <span className="text-purple-600">Paid By:</span>
                                  <span className="ml-1 font-semibold">Admin</span>
                                </div>
                              </div>
                              {transaction.depositPaid > 0 && (
                                <div className="mt-2 pt-2 border-t border-purple-200 text-xs">
                                  <div className="text-purple-700">
                                    Deposit Paid: ₹{transaction.depositPaid.toLocaleString('en-IN')}
                                  </div>
                                </div>
                              )}
                              {transaction.rentPaid > 0 && (
                                <div className="mt-1 text-xs text-purple-700">
                                  Rent Paid: ₹{transaction.rentPaid.toLocaleString('en-IN')}
                                </div>
                              )}
                            </div>
                          ) : null}

                          {/* No Payments Made */}
                          {!transaction.paidAmount && !transaction.adminPaidAmount && (
                            <div className="p-3 bg-gray-50 border border-gray-200 rounded-md text-center">
                              <span className="text-xs text-gray-500">No payments recorded yet</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Totals */}
                      <div className="mt-3 pt-2 border-t border-gray-300 flex justify-between items-center">
                        <div>
                          <span className="text-gray-600 font-medium">Total Paid:</span>
                          <span className="ml-2 text-lg font-bold text-green-600">
                            ₹{((transaction.paidAmount || 0) + (transaction.adminPaidAmount || 0)).toLocaleString('en-IN')}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600 font-medium">Total Payable:</span>
                          <span className="ml-2 text-lg font-bold text-blue-600">
                            ₹{(transaction.paymentDetails?.totalPayable || 0).toLocaleString('en-IN')}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Timestamps */}
                    <div className="mt-3 pt-2 border-t border-gray-100 flex justify-between text-xs text-gray-500">
                      <span>Created: {formatDate(transaction.createdAt)}</span>
                      {transaction.updatedAt && (
                        <span>Updated: {formatDate(transaction.updatedAt)}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex gap-3 flex-shrink-0">
              <button
                onClick={() => setShowDetailModal(false)}
                className="btn btn-secondary flex-1"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Online Payment Modal */}
      <ZwitchPaymentModal
        isOpen={showPaymentModal}
        onClose={() => {
          setShowPaymentModal(false);
          setSelectedPayment(null);
        }}
        selection={selectedPayment}
        onSuccess={handlePaymentSuccess}
      />
    </div>
  );
}