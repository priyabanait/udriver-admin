import { useState, useEffect } from 'react';
import { X, CreditCard, Loader2, ExternalLink } from 'lucide-react';
import { Card } from '../ui/Card';
import toast from 'react-hot-toast';

// Load Layer.js script
const loadLayerScript = () => {
  return new Promise((resolve, reject) => {
    if (window.Layer) {
      resolve();
      return;
    }
    
    const script = document.createElement('script');
    script.id = 'zwitch-layer';
    // Use LIVE/Production Layer.js for live API keys
    script.src = 'https://payments.open.money/layer';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Layer.js'));
    document.head.appendChild(script);
  });
};

export default function ZwitchPaymentModal({ isOpen, onClose, selection, onSuccess, paymentFor = 'driver' }) {
  const [loading, setLoading] = useState(false);
  const [scriptLoaded, setScriptLoaded] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadLayerScript()
        .then(() => setScriptLoaded(true))
        .catch(err => {
          console.error('Failed to load Layer.js:', err);
          toast.error('Failed to load payment gateway');
        });
    }
  }, [isOpen]);

  const handleCreateToken = async () => {
    if (!selection || !selection.totalPayable || selection.totalPayable <= 0) {
      toast.error('Invalid payment amount');
      return;
    }

    if (!scriptLoaded) {
      toast.error('Payment gateway not loaded. Please try again.');
      return;
    }

    setLoading(true);
    try {
      const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';
      const token = localStorage.getItem('token');

      // Determine which endpoint to use based on paymentFor
      const endpoint = paymentFor === 'investor' 
        ? '/api/payments/zwitch/create-token-investor'
        : '/api/payments/zwitch/create-token';

      // Prepare request body based on payment type
      const requestBody = paymentFor === 'investor' 
        ? {
            investorPhone: selection.investorPhone || selection.phone || selection.investor?.phone,
            amount: selection.totalPayable,
            investorName: selection.investorName || selection.investor?.investorName,
            investorEmail: selection.investor?.email,
            investmentId: selection.investmentId || selection._id,
            paymentType: 'investment'
          }
        : {
            driverMobile: selection.driverMobile || selection.driver?.mobile,
            amount: selection.totalPayable,
            driverName: selection.driverName || selection.driver?.name,
            driverEmail: selection.driver?.email,
            planSelectionId: selection._id,
            paymentType: 'rent'
          };

      const response = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(requestBody)
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to create payment token');
      }

      console.log('Payment token created:', data.data.paymentToken);
      
      // Open Layer.js payment modal
      openLayerCheckout(data.data.paymentToken, data.data.transactionId);

    } catch (error) {
      console.error('Payment token creation error:', error);
      toast.error(error.message || 'Failed to initiate payment');
      setLoading(false);
    }
  };

  const openLayerCheckout = (paymentToken, transactionId) => {
    const accessKey = import.meta.env.VITE_ZWITCH_ACCESS_KEY || 'a55ad409-80be-4d64-b3bf-4df213e74c18';
    
    console.log('🔑 Opening Layer checkout with:');
    console.log('Token:', paymentToken);
    console.log('Access Key:', accessKey);
    console.log('Layer available:', !!window.Layer);
    
    if (!window.Layer) {
      toast.error('Payment gateway not loaded. Please refresh the page.');
      setLoading(false);
      return;
    }
    
    window.Layer.checkout(
      {
        token: paymentToken,
        accesskey: accessKey,
        theme: {
          color: '#3B82F6',
          error_color: '#EF4444'
        }
      },
      function(response) {
        console.log('Layer.js response:', response);
        
        if (response.status === 'captured') {
          toast.success('Payment successful!');
          onSuccess({ transactionId, payment_id: response.payment_id, status: 'completed' });
          onClose();
        } else if (response.status === 'failed') {
          toast.error('Payment failed. Please try again.');
          setLoading(false);
        } else if (response.status === 'cancelled') {
          toast.info('Payment cancelled');
          setLoading(false);
        } else if (response.status === 'pending') {
          toast.info('Payment is pending...');
        }
      },
      function(err) {
        console.error('Layer.js error:', err);
        toast.error('Payment integration error');
        setLoading(false);
      }
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-blue-600" />
                Online Payment
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Secure payment via ZWITCH
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
              disabled={loading}
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Payment Details */}
          <div className="space-y-4 mb-6">
            <div className="bg-gray-50 p-4 rounded-lg space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">{paymentFor === 'investor' ? 'Investor' : 'Driver'}</span>
                <span className="font-medium text-gray-900">
                  {paymentFor === 'investor' 
                    ? (selection?.investorName || selection?.investor?.investorName || 'N/A')
                    : (selection?.driverName || 'N/A')
                  }
                </span>
              </div>
              {paymentFor === 'driver' && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Vehicle</span>
                  <span className="font-medium text-gray-900">
                    {selection?.carRegistrationNumber || 'N/A'}
                  </span>
                </div>
              )}
              {paymentFor === 'investor' && selection?.carname && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Investment</span>
                  <span className="font-medium text-gray-900">
                    {selection?.carname || 'N/A'}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">{paymentFor === 'investor' ? 'Phone' : 'Mobile'}</span>
                <span className="font-medium text-gray-900">
                  {paymentFor === 'investor'
                    ? (selection?.investorPhone || selection?.phone || selection?.investor?.phone || 'N/A')
                    : (selection?.driverMobile || selection?.driver?.mobile || 'N/A')
                  }
                </span>
              </div>
              <div className="border-t border-gray-200 pt-2 mt-2 flex justify-between">
                <span className="text-gray-900 font-semibold">Amount to Pay</span>
                <span className="text-xl font-bold text-blue-600">
                  ₹{selection?.totalPayable?.toFixed(2) || '0.00'}
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              onClick={handleCreateToken}
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Opening Payment...
                </>
              ) : (
                <>
                  <ExternalLink className="h-4 w-4" />
                  Proceed to Pay
                </>
              )}
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
}
