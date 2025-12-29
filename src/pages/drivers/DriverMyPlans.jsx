import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Car, Calendar, Clock, Shield, IndianRupee, ArrowLeft, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function DriverMyPlans() {
  const navigate = useNavigate();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [summaries, setSummaries] = useState({});

  const API_BASE = import.meta.env.VITE_API_BASE || 'https://udrive-backend-1igb.vercel.app';

  useEffect(() => {
    // Check if driver is logged in
    const token = localStorage.getItem('driver_token');
    if (!token) {
      toast.error('Please login first');
      navigate('/drivers/login');
      return;
    }

    fetchMyPlans();
  }, []);

  // Refresh plans if vehicle updates changed selections
  useEffect(() => {
    const handler = (e) => {
      console.log('Driver selections updated (my plans) - refreshing...', e?.detail);
      fetchMyPlans();
    };
    window.addEventListener('driverSelectionsUpdated', handler);
    return () => window.removeEventListener('driverSelectionsUpdated', handler);
  }, []);

  const fetchMyPlans = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('driver_token');
      const res = await fetch(`${API_BASE}/api/driver-plan-selections/my-plans`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (res.ok) {
        const data = await res.json();
        setPlans(data);
        // Load daily rent summaries for plans that have started and whose vehicle is active
        const idsToFetch = data
          .filter(p => p.rentStartDate && p.vehicleStatus === 'active')
          .map(p => p._id);
        if (idsToFetch.length) {
          const results = await Promise.allSettled(
            idsToFetch.map(id => fetch(`${API_BASE}/api/driver-plan-selections/${id}/rent-summary`).then(r => r.json()))
          );
          const map = {};
          results.forEach((r, idx) => {
            const id = idsToFetch[idx];
            if (r.status === 'fulfilled') map[id] = r.value;
          });
          setSummaries(map);
        }
      } else {
        toast.error('Failed to load your plans');
      }
    } catch (err) {
      console.error('Fetch my plans error:', err);
      toast.error('Network error');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      active: 'bg-green-100 text-green-800',
      completed: 'bg-gray-100 text-gray-800',
      cancelled: 'bg-red-100 text-red-800',
      inactive: 'bg-yellow-100 text-yellow-800'
    };
    return (
      <span className={`px-3 py-1 rounded-full text-sm font-semibold ${styles[status] || 'bg-gray-100 text-gray-800'}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#001730] via-[#002D62] to-[#004AAD]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#001730] via-[#002D62] to-[#004AAD] p-4">
      <div className="max-w-6xl mx-auto py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => navigate('/drivers/select-plan')}
            className="flex items-center text-white hover:text-[#00C6FF] transition-colors"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Select New Plan
          </button>
          <h1 className="text-3xl font-bold text-white text-center flex-1">My Plans</h1>
          <button
            onClick={() => {
              localStorage.removeItem('driver_token');
              navigate('/drivers/login');
            }}
            className="text-white hover:text-red-400 transition-colors"
          >
            Logout
          </button>
        </div>

        {/* Plans List */}
        {plans.length === 0 ? (
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-12 text-center">
            <Car className="h-16 w-16 mx-auto mb-4 text-white/50" />
            <p className="text-xl text-white mb-4">No plans selected yet</p>
            <button
              onClick={() => navigate('/drivers/select-plan')}
              className="bg-[#00C6FF] hover:bg-[#009EE3] text-[#001730] font-semibold px-6 py-3 rounded-lg transition-all"
            >
              Select a Plan
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {plans.map((plan) => (
              <div
                key={plan._id}
                className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border-2 border-white/20"
              >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                  {/* Plan Info */}
                  <div className="flex items-start space-x-4 mb-4 md:mb-0">
                    <div className="p-3 bg-[#00C6FF]/20 rounded-lg">
                      {plan.planType === 'weekly' ? (
                        <Calendar className="h-8 w-8 text-[#00C6FF]" />
                      ) : (
                        <Clock className="h-8 w-8 text-[#00C6FF]" />
                      )}
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-white mb-1">{plan.planName}</h3>
                      <div className="flex items-center space-x-3">
                        <span className="text-[#00C6FF] text-sm font-semibold uppercase">
                          {plan.planType} Plan
                        </span>
                        {getStatusBadge(plan.status)}
                      </div>
                      <p className="text-white/70 text-sm mt-2">
                        Selected on: {new Date(plan.selectedDate).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric'
                        })}
                      </p>
                    </div>
                  </div>

                  {/* Security Deposit */}
                  <div className="bg-white/10 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center text-white/70 text-sm">
                        <Shield className="h-5 w-5 mr-2" />
                        Security Deposit
                      </div>
                    </div>
                    <div className="text-[#00C6FF] font-bold text-2xl flex items-center mt-1">
                      <IndianRupee className="h-6 w-6" />
                      {plan.securityDeposit || 0}
                    </div>
                  </div>
                </div>

                {/* Rent Details */}
                {plan.selectedRentSlab && (
                  <div className="mt-4 bg-white/10 rounded-lg p-4">
                    <h4 className="text-white font-semibold mb-3">Selected Rent Plan</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div>
                        <p className="text-white/70 text-xs">Trips</p>
                        <p className="text-white font-bold">{plan.selectedRentSlab.trips}</p>
                      </div>
                      <div>
                        <p className="text-white/70 text-xs">Rent/Day</p>
                        <p className="text-[#00C6FF] font-bold flex items-center">
                          <IndianRupee className="h-4 w-4" />
                          {plan.selectedRentSlab.rentDay}
                        </p>
                      </div>
                      <div>
                        <p className="text-white/70 text-xs">Weekly Rent</p>
                        <p className="text-[#00C6FF] font-bold flex items-center">
                          <IndianRupee className="h-4 w-4" />
                          {plan.selectedRentSlab.weeklyRent}
                        </p>
                      </div>
                      <div>
                        <p className="text-white/70 text-xs">Accidental Cover</p>
                        <p className="text-[#00C6FF] font-bold flex items-center">
                          <IndianRupee className="h-4 w-4" />
                          {plan.selectedRentSlab.accidentalCover || 105}
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-white/20">
                      <div className="flex justify-between items-center">
                        <span className="text-white/70 text-sm">Total {plan.planType === 'weekly' ? 'Weekly' : 'Daily'} Payment</span>
                        <span className="text-[#00C6FF] font-bold text-xl flex items-center">
                          <IndianRupee className="h-5 w-5" />
                          {plan.planType === 'weekly'
                            ? (plan.selectedRentSlab.weeklyRent || 0) + (plan.selectedRentSlab.accidentalCover || 105)
                            : (plan.selectedRentSlab.rentDay || 0) + (plan.selectedRentSlab.accidentalCover || 105)
                          }
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Active Plan Indicator */}
                {plan.status === 'active' && (
                  <div className="mt-4 flex items-center justify-center bg-green-500/20 border border-green-500/50 rounded-lg py-2">
                    <CheckCircle className="h-5 w-5 text-green-400 mr-2" />
                    <span className="text-green-400 font-semibold">Active Plan</span>
                  </div>
                )}

                {/* Daily Rent Summary */}
                {plan.rentStartDate && plan.vehicleStatus === 'active' && (
                  <div className="mt-4 bg-white/10 rounded-lg p-4 border border-white/20">
                    <h4 className="text-white font-semibold mb-2">Daily Rent Summary</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-white">
                      <div>
                        <p className="text-white/70 text-xs">Start Date</p>
                        <p className="font-bold">{new Date(plan.rentStartDate).toLocaleDateString('en-IN')}</p>
                      </div>
                      <div>
                        <p className="text-white/70 text-xs">Rent / Day</p>
                        <p className="text-[#00C6FF] font-bold">₹{(summaries[plan._id]?.rentPerDay ?? plan.selectedRentSlab?.rentDay ?? 0).toLocaleString('en-IN')}</p>
                      </div>
                      <div>
                        <p className="text-white/70 text-xs">Days</p>
                        <p className="font-bold">{summaries[plan._id]?.totalDays ?? '-'}</p>
                      </div>
                      <div>
                        <p className="text-white/70 text-xs">Total Due</p>
                        <p className="text-[#00C6FF] font-bold">₹{(summaries[plan._id]?.totalDue ?? 0).toLocaleString('en-IN')}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
