import axios from 'axios';
import React, { useEffect, useState } from 'react';

export default function AddWalletAmount() {
    const [adminMessage, setAdminMessage] = useState('');
    const [adminMsgLoading, setAdminMsgLoading] = useState(false);
    const [adminMsgSuccess, setAdminMsgSuccess] = useState('');
    const handleAdminMessageSubmit = async (e) => {
      e.preventDefault();
      if (!selectedInvestor || !adminMessage) return;
      setAdminMsgLoading(true);
      setAdminMsgSuccess('');
      try {
        const investor = investors.find(inv => inv.id === selectedInvestor);
        await axios.post('https://udrive-backend-1igb.vercel.app/api/investor-wallet-message', {
          phone: investor.phone,
          message: adminMessage,
        });
        setAdminMessage('');
        setAdminMsgSuccess('Message sent to admin!');
      } catch (err) {
        setAdminMsgSuccess('Failed to send message');
      } finally {
        setAdminMsgLoading(false);
      }
    };
  const [investors, setInvestors] = useState([]);
  const [selectedInvestor, setSelectedInvestor] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [wallet, setWallet] = useState(null);
  const [submitLoading, setSubmitLoading] = useState(false);

  useEffect(() => {
    async function fetchInvestors() {
      setLoading(true);
      try {
        const res = await axios.get('https://udrive-backend-1igb.vercel.app/api/investors?limit=1000');
        const data = res.data.data || res.data;
        setInvestors(data);
      } catch (err) {
        console.error('Failed to fetch investors:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchInvestors();
  }, []);

  // Removed localStorage logic for selected investor

  useEffect(() => {
    async function fetchWallet() {
      if (!selectedInvestor) {
        setWallet(null);
        return;
      }
      setLoading(true);
      try {
        const investor = investors.find(inv => inv.id === selectedInvestor);
        if (investor) {
          const res = await axios.get(`https://udrive-backend-1igb.vercel.app/api/investor-wallet/${investor.phone}`);
          setWallet(res.data);
        }
      } catch (err) {
        setWallet(null);
      } finally {
        setLoading(false);
      }
    }
    fetchWallet();
  }, [selectedInvestor, investors]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedInvestor || !amount) return;
    setSubmitLoading(true);
    try {
      const investor = investors.find(inv => inv.id === selectedInvestor);
      await axios.post('https://udrive-backend-1igb.vercel.app/api/investor-wallet', {
        phone: investor.phone,
        amount: Number(amount),
        description,
        type: 'credit',
      });
      setAmount('');
      setDescription('');
      // Refresh wallet data
      const res = await axios.get(`https://udrive-backend-1igb.vercel.app/api/investor-wallet/${investor.phone}`);
      setWallet(res.data);
    } catch (err) {
      alert('Failed to add amount');
    } finally {
      setSubmitLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6 flex justify-center items-start">
      <div className="w-full max-w-xl bg-white shadow-lg rounded-2xl p-8 border border-gray-200">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Add Wallet Amount</h1>
        <form className="space-y-5" onSubmit={handleSubmit}>
          <div>
            <label className="block font-medium text-gray-700 mb-1">Select Investor</label>
            <select
              className="w-full border border-gray-300 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
              value={selectedInvestor}
              onChange={e => setSelectedInvestor(e.target.value)}
              disabled={loading}
            >
              <option value="">{loading ? 'Loading...' : 'Select Investor'}</option>
              {investors.map(inv => (
                <option key={inv.id} value={inv.id}>{inv.investorName} ({inv.phone})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block font-medium text-gray-700 mb-1">Enter Amount</label>
            <input
              type="number"
              placeholder="Enter wallet amount"
              className="w-full border border-gray-300 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              disabled={!selectedInvestor || submitLoading}
            />
          </div>
          <div>
            <label className="block font-medium text-gray-700 mb-1">Description (optional)</label>
            <textarea
              rows="3"
              placeholder="Reason for adding wallet amount"
              className="w-full border border-gray-300 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
              value={description}
              onChange={e => setDescription(e.target.value)}
              disabled={!selectedInvestor || submitLoading}
            ></textarea>
          </div>
          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg shadow-md transition-all"
            disabled={submitLoading || !selectedInvestor || !amount}
          >
            {submitLoading ? 'Adding...' : 'Add Amount'}
          </button>
        </form>
        {wallet && (
          <div className="mt-8">
            <h2 className="text-lg font-semibold mb-2">Wallet Details</h2>
            <div className="mb-2">Balance: <span className="font-bold">₹{wallet.balance}</span></div>
            <div>
              <h3 className="font-medium mb-1">Transactions:</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full border text-sm">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-3 py-2 border">#</th>
                      <th className="px-3 py-2 border">Amount</th>
                      <th className="px-3 py-2 border">Type</th>
                      <th className="px-3 py-2 border">Description</th>
                      <th className="px-3 py-2 border">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {wallet.transactions.slice().reverse().map((txn, idx) => (
                      <tr key={idx} className="border-b">
                        <td className="px-3 py-2 border">{idx + 1}</td>
                        <td className="px-3 py-2 border">₹{txn.amount}</td>
                        <td className="px-3 py-2 border">{txn.type}</td>
                        <td className="px-3 py-2 border">{txn.description || '-'}</td>
                        <td className="px-3 py-2 border">{new Date(txn.date).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            {/* Admin Message Form */}
            {/* <div className="mt-8">
              <h2 className="text-lg font-semibold mb-2">Send Message to Admin</h2>
              <form className="space-y-3" onSubmit={handleAdminMessageSubmit}>
                <textarea
                  rows="3"
                  placeholder="Type your message for admin..."
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                  value={adminMessage}
                  onChange={e => setAdminMessage(e.target.value)}
                  disabled={adminMsgLoading}
                ></textarea>
                <button
                  type="submit"
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2 rounded-lg shadow-md transition-all"
                  disabled={adminMsgLoading || !adminMessage}
                >
                  {adminMsgLoading ? 'Sending...' : 'Send Message'}
                </button>
                {adminMsgSuccess && (
                  <div className={`text-sm mt-2 ${adminMsgSuccess.includes('Failed') ? 'text-red-600' : 'text-green-600'}`}>{adminMsgSuccess}</div>
                )}
              </form>
            </div> */}
          </div>
        )}
      </div>
    </div>
  );
}
