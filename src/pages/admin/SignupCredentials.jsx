import { PERMISSIONS } from '../../utils/permissions';
import { PermissionGuard } from '../../components/guards/PermissionGuards';

// --- Edit Modal State ---
import React from 'react';

function EditCredentialModal({ open, type, user, onClose, onSave }) {
  const [form, setForm] = React.useState(user || {});
  React.useEffect(() => { setForm(user || {}); }, [user]);
  let fields = [];
  if (type === 'driver') {
    fields = [
      { key: 'username', label: 'Username' },
      { key: 'mobile', label: 'Mobile' },
      { key: 'password', label: 'Password' },
      { key: 'status', label: 'Status' },
      { key: 'kycStatus', label: 'KYC Status' }
    ];
  } else {
    fields = [
      { key: 'investorName', label: 'Name' },
      { key: 'email', label: 'Email' },
      { key: 'phone', label: 'Phone' },
      { key: 'password', label: 'Password/OTP' },
      { key: 'status', label: 'Status' },
      { key: 'kycStatus', label: 'KYC Status' }
    ];
  }
  if (!open) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6 relative">
        <button className="absolute top-2 right-2 text-gray-400 hover:text-gray-700" onClick={onClose}>&times;</button>
        <h2 className="text-lg font-bold mb-4">Edit {type === 'driver' ? 'Driver' : 'Investor'} Credentials</h2>
        <form onSubmit={e => { e.preventDefault(); onSave(form); }} className="space-y-3">
          {fields.map(f => (
            <div key={f.key}>
              <label className="block text-sm font-medium text-gray-700 mb-1">{f.label}</label>
              <input
                className="input w-full"
                value={form[f.key] || ''}
                onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                type="text"
                autoComplete="off"
              />
            </div>
          ))}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary">Save</button>
          </div>
        </form>
      </div>
    </div>
  );
}


// --- Edit Modal Logic ---
// eslint-disable-next-line no-unused-vars
const [editModal, setEditModal] = typeof window !== 'undefined' && window.__SIGNUP_EDIT_MODAL_STATE__ ? window.__SIGNUP_EDIT_MODAL_STATE__ : [null, () => {}];

function SignupEditModalManager({ children }) {
  const [modal, setModal] = React.useState({ open: false, type: '', user: null });
  window.__SIGNUP_EDIT_MODAL_STATE__ = [modal, setModal];
  return <>{children}<EditCredentialModal open={modal.open} type={modal.type} user={modal.user} onClose={() => setModal({ open: false })} onSave={async (updated) => {
    try {
      const id = updated._id || updated.id;
      if (!id) throw new Error('Missing record ID');
      const url = modal.type === 'driver'
        ? `${API_BASE}/api/drivers/${id}`
        : `${API_BASE}/api/investors/signup/credentials/${id}`;
      const res = await fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated)
      });
      if (!res.ok) throw new Error('Failed to update');
      toast.success('Updated successfully');
      setModal({ open: false });
      window.location.reload();
    } catch (err) {
      toast.error(err.message || 'Failed to update');
    }
  }} /></>;
}

function handleEdit(type, user) {
  if (typeof window !== 'undefined' && window.__SIGNUP_EDIT_MODAL_STATE__) {
    const [, setModal] = window.__SIGNUP_EDIT_MODAL_STATE__;
    setModal({ open: true, type, user });
  }
}

async function handleDelete(type, user) {
  if (!window.confirm('Are you sure you want to delete this record?')) return;
  try {
    const url = type === 'driver'
      ? `${API_BASE}/api/drivers/${user._id || user.id}`
      : `${API_BASE}/api/investors/signup/credentials/${user._id || user.id}`;
    const res = await fetch(url, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete');
    toast.success('Deleted successfully');
    window.location.reload();
  } catch (err) {
    toast.error(err.message || 'Failed to delete');
  }
}
import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Search, Users, Shield, Edit, Trash2, TestTube } from 'lucide-react';
import { formatDate } from '../../utils';
import toast from 'react-hot-toast';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';

export default function SignupCredentials() {
  const [activeTab, setActiveTab] = useState('drivers'); // 'drivers' | 'investors'
  const [drivers, setDrivers] = useState([]);
  const [investors, setInvestors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [testToken, setTestToken] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const loadAll = async () => {
    try {
      setLoading(true);
      
      // Build query params with search
      let driverParams = new URLSearchParams({
        page: '1',
        limit: '2000' // Increased limit to show all drivers
      });
      let investorParams = new URLSearchParams({
        page: '1',
        limit: '100'
      });
      
      if (search && search.trim()) {
        driverParams.append('q', search.trim());
        investorParams.append('q', search.trim());
      }
      
      const [dRes, iRes] = await Promise.all([
        fetch(`${API_BASE}/api/drivers?${driverParams.toString()}`),
        fetch(`${API_BASE}/api/investors/signup/credentials?${investorParams.toString()}`)
      ]);
      if (!dRes.ok) throw new Error('Failed to load drivers');
      if (!iRes.ok) throw new Error('Failed to load investor signups');
      const [dResult, iResult] = await Promise.all([dRes.json(), iRes.json()]);
      const dData = dResult.data || dResult;
      const iData = iResult.data || iResult;
      setDrivers(Array.isArray(dData) ? dData : []);
      setInvestors(Array.isArray(iData) ? iData : []);
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Failed to load signup credentials');
      setDrivers([]);
      setInvestors([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Refetch when search changes (with debounce)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      loadAll();
    }, search ? 500 : 0); // Debounce search by 500ms
    
    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  // Server-side filtering is now used via API, so we just use the data directly
  const filteredDrivers = drivers;
  const filteredInvestors = investors;
const rowsPerPage = 10; // rows per page
const [currentPage, setCurrentPage] = useState(1);

// Decide which data to show based on activeTab
const data = activeTab === 'drivers' ? filteredDrivers : filteredInvestors;

// Pagination calculations
const totalPages = Math.ceil(data.length / rowsPerPage);
const paginatedData = data.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);
  return (
    <SignupEditModalManager>
      <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Signup Credentials</h1>
          <p className="text-gray-600">View driver and investor signup records</p>
        </div>
      </div>

      {/* Test Delete Account API Section */}
       {/* <Card>
        <CardContent className="p-6">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <TestTube className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-yellow-900 mb-2">
                  Test Delete Account API
                </h3>
                <p className="text-sm text-yellow-700 mb-4">
                  Enter a driver authentication token to test the delete account API endpoint.
                  This will permanently delete the driver account and all related data.
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={testToken}
                    onChange={(e) => setTestToken(e.target.value)}
                    placeholder="Enter driver JWT token for testing..."
                    className="flex-1 px-3 py-2 border border-yellow-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  />
                  <button
                    onClick={async () => {
                      if (!testToken.trim()) {
                        toast.error('Please enter a driver token');
                        return;
                      }

                      const confirmed = window.confirm(
                        '⚠️ WARNING: This will permanently delete the driver account and all related data!\n\n' +
                        'This includes:\n' +
                        '- Driver account\n' +
                        '- All enrollments\n' +
                        '- Wallet records and messages\n' +
                        '- Plan selections\n' +
                        '- Transactions\n' +
                        '- Tickets\n' +
                        '- Expenses\n' +
                        '- Notifications\n' +
                        '- Vehicle assignments will be cleared\n\n' +
                        'Are you absolutely sure you want to proceed?'
                      );
                      
                      if (!confirmed) return;

                      const doubleConfirm = window.confirm(
                        'This is your last chance to cancel. Type "DELETE" in the next prompt to confirm.'
                      );
                      
                      if (!doubleConfirm) return;

                      const finalConfirm = window.prompt(
                        'Type "DELETE" to confirm account deletion:'
                      );

                      if (finalConfirm !== 'DELETE') {
                        toast.error('Account deletion cancelled');
                        return;
                      }

                      setIsDeleting(true);
                      try {
                        const res = await fetch(`${API_BASE}/api/driver-auth/delete-account`, {
                          method: 'DELETE',
                          headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${testToken.trim()}`
                          }
                        });

                        const data = await res.json();

                        if (!res.ok) {
                          throw new Error(data.message || `Failed to delete account: ${res.status}`);
                        }

                        toast.success(data.message || 'Account deleted successfully');
                        setTestToken('');
                        
                        // Reload the page to refresh the driver list
                        setTimeout(() => {
                          loadAll();
                        }, 1000);

                      } catch (error) {
                        console.error('Delete account error:', error);
                        toast.error(error.message || 'Failed to delete account. Please check the token and try again.');
                      } finally {
                        setIsDeleting(false);
                      }
                    }}
                    disabled={isDeleting || !testToken.trim()}
                    className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-red-400 disabled:cursor-not-allowed transition-colors flex items-center gap-2 text-sm font-medium"
                  >
                    <Trash2 className="h-4 w-4" />
                    {isDeleting ? 'Deleting...' : 'Test Delete Account'}
                  </button>
                </div>
                <p className="text-xs text-yellow-600 mt-2">
                  💡 Tip: Get the token from driver login response or localStorage
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>  */}

      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="inline-flex rounded-md shadow-sm" role="group">
              <button
                onClick={() => setActiveTab('drivers')}
                className={`px-4 py-2 text-sm font-medium border ${
                  activeTab === 'drivers' ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-gray-700 border-gray-300'
                } rounded-l-md flex items-center`}
              >
                <Users className="h-4 w-4 mr-2" /> Drivers
              </button>
              <button
                onClick={() => setActiveTab('investors')}
                className={`px-4 py-2 text-sm font-medium border ${
                  activeTab === 'investors' ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-gray-700 border-gray-300'
                } rounded-r-md flex items-center`}
              >
                <Shield className="h-4 w-4 mr-2" /> Investors
              </button>
            </div>

            <div className="relative w-full md:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name, phone, status..."
                className="w-full border border-gray-300 rounded-md py-2 pl-10 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading signup credentials...</p>
          </div>
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>
              {activeTab === 'drivers' ? `Driver Signups (${filteredDrivers.length})` : `Investor Signups (${filteredInvestors.length})`}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  {activeTab === 'drivers' ? (
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Username</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mobile</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Password</th>
                      {/* <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">KYC Status</th> */}
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Signup Date</th>
                       <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  ) : (
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Password/OTP</th>
                      {/* <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">KYC Status</th> */}
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Signup Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  )}
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {activeTab === 'drivers' ? (
                    paginatedData.map((d, idx) => (
                      <tr key={d._id || idx} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{d.username || '—'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{d.mobile}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-700">{d.password}</td>
                        {/* <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            d.status === 'active' ? 'bg-green-100 text-green-700' : d.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-700'
                          }`}>{d.status || '—'}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            d.kycStatus === 'verified' ? 'bg-green-100 text-green-700' : d.kycStatus === 'pending' ? 'bg-yellow-100 text-yellow-700' : d.kycStatus === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'
                          }`}>{d.kycStatus || '—'}</span>
                        </td> */}
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{d.signupDate ? formatDate(d.signupDate) : '—'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm flex gap-2">
                          <PermissionGuard permission={PERMISSIONS.DRIVERS_EDIT}>
                            <button
                              onClick={() => handleEdit('driver', d)}
                              className="p-1 text-gray-400 hover:text-green-600"
                              title="Edit Driver"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                          </PermissionGuard>
                          <button
                            onClick={() => handleDelete('driver', d)}
                            className="p-1 text-gray-400 hover:text-red-600"
                            title="Delete Driver"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    paginatedData.map((i, idx) => (
                      <tr key={i._id || idx} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{i.investorName || '—'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{i.email || '—'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{i.phone}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-700">{i.password}</td>
                        {/* <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            i.status === 'active' ? 'bg-green-100 text-green-700' : i.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-700'
                          }`}>{i.status || '—'}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            i.kycStatus === 'verified' ? 'bg-green-100 text-green-700' : i.kycStatus === 'pending' ? 'bg-yellow-100 text-yellow-700' : i.kycStatus === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'
                          }`}>{i.kycStatus || '—'}</span>
                        </td> */}
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{i.signupDate ? formatDate(i.signupDate) : '—'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm flex gap-2">
                          <button
                            onClick={() => handleEdit('investor', i)}
                            className="p-1 text-gray-400 hover:text-green-600"
                            title="Edit Investor"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete('investor', i)}
                            className="p-1 text-gray-400 hover:text-red-600"
                            title="Delete Investor"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
           
          </CardContent>
           {data.length > rowsPerPage && (
      <div className="flex items-center justify-between px-4 py-3 border-t text-sm">
        <div className="text-gray-600">
          Showing {(currentPage - 1) * rowsPerPage + 1} – {Math.min(currentPage * rowsPerPage, data.length)} of {data.length}
        </div>
        <div className="flex items-center gap-2">
          <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="px-3 py-1 border rounded disabled:opacity-50">
            Prev
          </button>
          <span className="px-2">Page {currentPage} of {totalPages}</span>
          <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} className="px-3 py-1 border rounded disabled:opacity-50">
            Next
          </button>
        </div>
      </div>
    )}
        </Card>
      )}
      </div>
    </SignupEditModalManager>
  );
}
