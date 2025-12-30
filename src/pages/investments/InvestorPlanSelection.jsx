import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IndianRupee, Calendar, TrendingUp, Shield, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import PaymentConfirmationModal from '../../components/investors/PaymentConfirmationModal';
import { computeFdMaturity } from '../../utils';

export default function InvestorPlanSelection() {
  const navigate = useNavigate();
  const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';

  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);

  // FD form state
  const [investorName, setInvestorName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [investmentDate, setInvestmentDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [investmentAmount, setInvestmentAmount] = useState('');
  const [investmentRate, setInvestmentRate] = useState('');
  const [fdType, setFdType] = useState('monthly');
  const [termMonths, setTermMonths] = useState(6);
  const [termYears, setTermYears] = useState(1);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Payment modal state
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [createdFdData, setCreatedFdData] = useState(null);

  useEffect(() => {
    const storedId = localStorage.getItem('investor_id');
    const storedName = localStorage.getItem('investor_name');
    const storedPhone = localStorage.getItem('investor_phone');
    if (storedName) setInvestorName(storedName);
    if (storedPhone) setPhone(storedPhone);

    const fetchPlans = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE}/api/investment-plans`);
        const data = await res.json();
        setPlans(Array.isArray(data) ? data.filter(p => p.active !== false) : []);
      } catch (e) {
        toast.error('Failed to load investment plans');
      } finally {
        setLoading(false);
      }
    };

    fetchPlans();
  }, []);

  useEffect(() => {
    if (selectedPlan) {
      // Prefill rate and sensible default term from plan
      if (selectedPlan.expectedROI != null) setInvestmentRate(String(selectedPlan.expectedROI));
      // If plan.duration exists (months), prefill fdType/months accordingly
      if (selectedPlan.duration) {
        const months = Number(selectedPlan.duration) || 0;
        if (months >= 12 && months % 12 === 0) {
          setFdType('yearly');
          setTermYears(Math.min(Math.max(months / 12, 1), 10));
        } else {
          setFdType('monthly');
          setTermMonths(Math.min(Math.max(months || 6, 1), 12));
        }
      }
      // Prefill amount to plan.minAmount if empty
      if (!investmentAmount && selectedPlan.minAmount) setInvestmentAmount(String(selectedPlan.minAmount));
    }
  }, [selectedPlan]);

  const minAmount = selectedPlan?.minAmount ?? 0;
  const maxAmount = selectedPlan?.maxAmount ?? 0;

  const validPaymentMethods = useMemo(() => ['Cash', 'Bank Transfer', 'Cheque', 'Online', 'UPI'], []);

  const handleCreateFD = async () => {
    if (!selectedPlan) {
      toast.error('Please select an investment plan');
      return;
    }

    if (!investorName || !phone || !address) {
      toast.error('Name, phone and address are required');
      return;
    }

    if (!investmentAmount || Number(investmentAmount) <= 0) {
      toast.error('Enter a valid investment amount');
      return;
    }

    if (minAmount && Number(investmentAmount) < minAmount) {
      toast.error(`Amount should be at least ₹${minAmount.toLocaleString('en-IN')}`);
      return;
    }
    if (maxAmount && Number(investmentAmount) > maxAmount) {
      toast.error(`Amount should not exceed ₹${maxAmount.toLocaleString('en-IN')}`);
      return;
    }

    if (!['monthly', 'yearly'].includes(fdType)) {
      toast.error('Choose FD type: monthly or yearly');
      return;
    }

    if (fdType === 'monthly' && (Number(termMonths) < 1 || Number(termMonths) > 12)) {
      toast.error('For monthly FD, term must be 1-12 months');
      return;
    }
    if (fdType === 'yearly' && (Number(termYears) < 1 || Number(termYears) > 10)) {
      toast.error('For yearly FD, term must be 1-10 years');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/api/investment-fds`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          investorName,
          email,
          phone,
          address,
          investmentDate,
          paymentMethod,
          investmentRate: Number(investmentRate || 0),
          investmentAmount: Number(investmentAmount),
          planId: selectedPlan.id || selectedPlan._id,
          fdType,
          termMonths: fdType === 'monthly' ? Number(termMonths) : undefined,
          termYears: fdType === 'yearly' ? Number(termYears) : undefined,
          status: 'active',
          notes,
          paymentStatus: 'pending'
        })
      });
      const data = await res.json();
      if (res.ok) {
        toast.success('FD created successfully');
        // Store FD data and show payment modal
        setCreatedFdData({
          ...data,
          investorName,
          investmentAmount: Number(investmentAmount),
          investmentRate: Number(investmentRate || 0),
          fdType,
          termMonths: fdType === 'monthly' ? Number(termMonths) : undefined,
          termYears: fdType === 'yearly' ? Number(termYears) : undefined
        });
        setShowPaymentModal(true);
      } else {
        toast.error(data.error || data.message || 'Failed to create FD');
      }
    } catch (e) {
      toast.error('Network error. Please try again');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePaymentComplete = async (paymentMode) => {
    if (!createdFdData || !createdFdData._id) {
      console.error('FD data not found:', createdFdData);
      toast.error('FD data not found');
      return;
    }

    console.log('Confirming payment:', {
      fdId: createdFdData._id,
      paymentMode,
      apiUrl: `${API_BASE}/api/investment-fds/${createdFdData._id}/confirm-payment`
    });

    try {
      const res = await fetch(`${API_BASE}/api/investment-fds/${createdFdData._id}/confirm-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentMode })
      });

      console.log('Payment confirmation response status:', res.status);

      const data = await res.json();
      console.log('Payment confirmation response data:', data);
      
      if (res.ok) {
        toast.success(`Payment confirmed via ${paymentMode}!`);
        setShowPaymentModal(false);
        // Navigate to home or investments page
        setTimeout(() => {
          navigate('/');
        }, 1500);
      } else {
        console.error('Payment confirmation failed:', data);
        toast.error(data.error || data.message || 'Failed to confirm payment');
      }
    } catch (error) {
      console.error('Payment confirmation error:', error);
      toast.error('Network error. Failed to confirm payment');
      throw error;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#001730] via-[#002D62] to-[#004AAD] p-4">
      <div className="max-w-6xl mx-auto py-8">
        <div className="flex items-center justify-between mb-8">
          <button onClick={() => navigate(-1)} className="text-white/80 hover:text-white">Back</button>
          <h1 className="text-3xl font-bold text-white">Select Investment Plan</h1>
          <div className="w-12" />
        </div>

        {/* Login hint if no investor info */}
        {(!investorName || !phone) && (
          <div className="mb-6 bg-white/10 border border-white/20 rounded-xl p-4 text-white/80">
            Tip: Login via <button className="underline text-[#00C6FF]" onClick={() => navigate('/investors/login')}>Investor Login</button> to prefill your details.
          </div>
        )}

        {/* Plans grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {loading ? (
            <div className="col-span-full flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
            </div>
          ) : plans.length === 0 ? (
            <div className="col-span-full text-center text-white/70">No plans available</div>
          ) : (
            plans.map(plan => (
              <div
                key={plan.id || plan._id}
                onClick={() => setSelectedPlan(plan)}
                className={`bg-white/10 backdrop-blur-lg rounded-2xl p-6 cursor-pointer transition-all border-2 ${
                  selectedPlan && (selectedPlan.id || selectedPlan._id) === (plan.id || plan._id)
                    ? 'border-[#00C6FF] shadow-xl shadow-[#00C6FF]/20 scale-105'
                    : 'border-white/20 hover:border-white/40'
                }`}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-[#00C6FF]/20 rounded-lg">
                    <TrendingUp className="h-8 w-8 text-[#00C6FF]" />
                  </div>
                  {selectedPlan && (selectedPlan.id || selectedPlan._id) === (plan.id || plan._id) && (
                    <CheckCircle className="h-8 w-8 text-[#00C6FF]" />
                  )}
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">{plan.name}</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white/10 rounded-lg p-3">
                    <p className="text-white/70 text-xs">Min Amount</p>
                    <p className="text-[#00C6FF] font-bold flex items-center">
                      <IndianRupee className="h-4 w-4" />{(plan.minAmount || 0).toLocaleString('en-IN')}
                    </p>
                  </div>
                  <div className="bg-white/10 rounded-lg p-3">
                    <p className="text-white/70 text-xs">Max Amount</p>
                    <p className="text-[#00C6FF] font-bold flex items-center">
                      <IndianRupee className="h-4 w-4" />{(plan.maxAmount || 0).toLocaleString('en-IN')}
                    </p>
                  </div>
                  <div className="bg-white/10 rounded-lg p-3">
                    <p className="text-white/70 text-xs">Duration</p>
                    <p className="text-white font-semibold flex items-center">
                      <Calendar className="h-4 w-4 mr-1" />{plan.duration} months
                    </p>
                  </div>
                  <div className="bg-white/10 rounded-lg p-3">
                    <p className="text-white/70 text-xs">Expected ROI</p>
                    <p className="text-white font-semibold flex items-center">
                      <Shield className="h-4 w-4 mr-1" />{plan.expectedROI}%
                    </p>
                  </div>
                </div>
                {plan.description && (
                  <p className="text-white/70 text-sm mt-3 line-clamp-3">{plan.description}</p>
                )}
              </div>
            ))
          )}
        </div>

        {/* FD creation form */}
        {selectedPlan && (
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border-2 border-[#00C6FF]">
            <h2 className="text-2xl font-bold text-white mb-4">Create FD for: {selectedPlan.name}</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-white/80 text-sm mb-1">Investor Name</label>
                <input value={investorName} onChange={e => setInvestorName(e.target.value)} className="w-full bg-white/10 border border-white/20 rounded-lg py-2 px-3 text-white" placeholder="Your full name" />
              </div>
              <div>
                <label className="block text-white/80 text-sm mb-1">Phone</label>
                <input value={phone} onChange={e => setPhone(e.target.value)} className="w-full bg-white/10 border border-white/20 rounded-lg py-2 px-3 text-white" placeholder="10-digit mobile" />
              </div>
              <div>
                <label className="block text-white/80 text-sm mb-1">Email (optional)</label>
                <input value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-white/10 border border-white/20 rounded-lg py-2 px-3 text-white" placeholder="name@example.com" />
              </div>
              <div>
                <label className="block text-white/80 text-sm mb-1">Address</label>
                <input value={address} onChange={e => setAddress(e.target.value)} className="w-full bg-white/10 border border-white/20 rounded-lg py-2 px-3 text-white" placeholder="Address" />
              </div>

              <div>
                <label className="block text-white/80 text-sm mb-1">Investment Date</label>
                <input type="date" value={investmentDate} onChange={e => setInvestmentDate(e.target.value)} className="w-full bg-white/10 border border-white/20 rounded-lg py-2 px-3 text-white" />
              </div>
              <div>
                <label className="block text-white/80 text-sm mb-1">Payment Method</label>
                <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} className="w-full bg-white/10 border border-white/20 rounded-lg py-2 px-3 text-white">
                  {validPaymentMethods.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-white/80 text-sm mb-1">Investment Amount</label>
                <input type="number" min={minAmount || undefined} max={maxAmount || undefined} value={investmentAmount} onChange={e => setInvestmentAmount(e.target.value)} className="w-full bg-white/10 border border-white/20 rounded-lg py-2 px-3 text-white" placeholder={`Between ₹${minAmount.toLocaleString('en-IN')} and ₹${maxAmount.toLocaleString('en-IN')}`} />
              </div>
              <div>
                <label className="block text-white/80 text-sm mb-1">Investment Rate (%)</label>
                <input type="number" min={0} step="0.01" value={investmentRate} onChange={e => setInvestmentRate(e.target.value)} className="w-full bg-white/10 border border-white/20 rounded-lg py-2 px-3 text-white" />
              </div>

              <div>
                <label className="block text-white/80 text-sm mb-1">FD Type</label>
                <select value={fdType} onChange={e => setFdType(e.target.value)} className="w-full bg-white/10 border border-white/20 rounded-lg py-2 px-3 text-white">
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>
              {fdType === 'monthly' ? (
                <div>
                  <label className="block text-white/80 text-sm mb-1">Term (Months)</label>
                  <input type="number" min={1} max={12} value={termMonths} onChange={e => setTermMonths(e.target.value)} className="w-full bg-white/10 border border-white/20 rounded-lg py-2 px-3 text-white" />
                </div>
              ) : (
                <div>
                  <label className="block text-white/80 text-sm mb-1">Term (Years)</label>
                  <input type="number" min={1} max={10} value={termYears} onChange={e => setTermYears(e.target.value)} className="w-full bg-white/10 border border-white/20 rounded-lg py-2 px-3 text-white" />
                </div>
              )}

              <div className="md:col-span-2">
                <label className="block text-white/80 text-sm mb-1">Notes (optional)</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} className="w-full bg-white/10 border border-white/20 rounded-lg py-2 px-3 text-white" rows={3} placeholder="Any additional details" />
              </div>
            </div>

            {/* Summary */}
            <div className="mt-6 bg-gradient-to-r from-[#00C6FF]/20 to-[#004AAD]/20 rounded-xl p-6 border-2 border-[#00C6FF]">
              <h3 className="text-xl font-bold text-white mb-3">Summary</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white/10 rounded-lg p-3">
                  <p className="text-white/70 text-xs">Amount</p>
                  <p className="text-[#00C6FF] font-bold flex items-center"><IndianRupee className="h-4 w-4" />{Number(investmentAmount || 0).toLocaleString('en-IN')}</p>
                </div>
                <div className="bg-white/10 rounded-lg p-3">
                  <p className="text-white/70 text-xs">Rate</p>
                  <p className="text-white font-semibold">{investmentRate || 0}%</p>
                </div>
                <div className="bg-white/10 rounded-lg p-3">
                  <p className="text-white/70 text-xs">Term</p>
                  <p className="text-white font-semibold">{fdType === 'monthly' ? `${termMonths} months` : `${termYears} years`}</p>
                </div>
              </div>

              {/* Maturity preview */}
              <div className="mt-4 bg-white/10 rounded-lg p-3">
                <p className="text-white/70 text-xs">Estimated Maturity</p>
                {Number(investmentAmount) > 0 && Number(investmentRate) > 0 ? (
                  (() => {
                    const fdResult = computeFdMaturity({
                      principal: Number(investmentAmount),
                      ratePercent: Number(investmentRate || 0),
                      fdType,
                      termMonths: fdType === 'monthly' ? Number(termMonths) : undefined,
                      termYears: fdType === 'yearly' ? Number(termYears) : undefined
                    });
                    return (
                      <div className="mt-2 flex items-center justify-between">
                        <div>
                          <div className="text-white font-semibold">{fdResult.maturityAmount.toLocaleString('en-IN')}</div>
                          <div className="text-xs text-white/70">Interest: ₹{fdResult.interest.toLocaleString('en-IN')}</div>
                        </div>
                        <div className="text-xs text-white/70">{fdType === 'monthly' ? 'Simple Interest' : 'Compound Interest'}</div>
                      </div>
                    );
                  })()
                ) : (
                  <div className="mt-2 text-white/70">Enter amount and rate to preview</div>
                )}
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button onClick={handleCreateFD} disabled={submitting} className={`px-6 py-3 rounded-lg font-semibold ${submitting ? 'bg-gray-500 text-gray-300' : 'bg-[#00C6FF] hover:bg-[#009EE3] text-[#001730]'}`}>
                {submitting ? 'Creating FD...' : 'Create FD'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Payment Confirmation Modal */}
      <PaymentConfirmationModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        fdData={createdFdData}
        onPaymentComplete={handlePaymentComplete}
      />
    </div>
  );
}
