import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Search, Users, Shield } from 'lucide-react';
import { formatDate } from '../../utils';
import toast from 'react-hot-toast';

const API_BASE = import.meta.env.VITE_API_BASE || 'https://udrive-backend-1igb.vercel.app';

export default function SignupCredentials() {
  const [activeTab, setActiveTab] = useState('drivers'); // 'drivers' | 'investors'
  const [drivers, setDrivers] = useState([]);
  const [investors, setInvestors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    let mounted = true;
    async function loadAll() {
      try {
        setLoading(true);
        const [dRes, iRes] = await Promise.all([
          fetch(`${API_BASE}/api/drivers/signup/credentials`),
          fetch(`${API_BASE}/api/investors/signup/credentials`)
        ]);
        if (!dRes.ok) throw new Error('Failed to load driver signups');
        if (!iRes.ok) throw new Error('Failed to load investor signups');
        const [dData, iData] = await Promise.all([dRes.json(), iRes.json()]);
        if (!mounted) return;
        setDrivers(Array.isArray(dData) ? dData : []);
        setInvestors(Array.isArray(iData) ? iData : []);
      } catch (err) {
        console.error(err);
        toast.error(err.message || 'Failed to load signup credentials');
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadAll();
    return () => { mounted = false; };
  }, []);

  const filteredDrivers = drivers.filter(d => {
    const q = search.toLowerCase();
    return (
      d.username?.toLowerCase().includes(q) ||
      d.mobile?.toLowerCase().includes(q) ||
      d.status?.toLowerCase().includes(q) ||
      d.kycStatus?.toLowerCase().includes(q)
    );
  });

  const filteredInvestors = investors.filter(i => {
    const q = search.toLowerCase();
    return (
      i.investorName?.toLowerCase().includes(q) ||
      i.email?.toLowerCase().includes(q) ||
      i.phone?.toLowerCase().includes(q) ||
      i.status?.toLowerCase().includes(q) ||
      i.kycStatus?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Signup Credentials</h1>
          <p className="text-gray-600">View driver and investor signup records</p>
        </div>
      </div>

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
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">KYC Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Signup Date</th>
                    </tr>
                  ) : (
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Password/OTP</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">KYC Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Signup Date</th>
                    </tr>
                  )}
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {activeTab === 'drivers' ? (
                    filteredDrivers.map((d, idx) => (
                      <tr key={d._id || idx} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{d.username || '—'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{d.mobile}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-700">{d.password}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            d.status === 'active' ? 'bg-green-100 text-green-700' : d.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-700'
                          }`}>{d.status || '—'}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            d.kycStatus === 'verified' ? 'bg-green-100 text-green-700' : d.kycStatus === 'pending' ? 'bg-yellow-100 text-yellow-700' : d.kycStatus === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'
                          }`}>{d.kycStatus || '—'}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{d.signupDate ? formatDate(d.signupDate) : '—'}</td>
                      </tr>
                    ))
                  ) : (
                    filteredInvestors.map((i, idx) => (
                      <tr key={i._id || idx} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{i.investorName || '—'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{i.email || '—'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{i.phone}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-700">{i.password}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            i.status === 'active' ? 'bg-green-100 text-green-700' : i.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-700'
                          }`}>{i.status || '—'}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            i.kycStatus === 'verified' ? 'bg-green-100 text-green-700' : i.kycStatus === 'pending' ? 'bg-yellow-100 text-yellow-700' : i.kycStatus === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'
                          }`}>{i.kycStatus || '—'}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{i.signupDate ? formatDate(i.signupDate) : '—'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
