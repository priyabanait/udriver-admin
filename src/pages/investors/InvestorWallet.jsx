import axios from 'axios';
import React, { useEffect, useState } from 'react';

export default function AddWalletAmount() {
  const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';

  const [investors, setInvestors] = useState([]);
  const [selectedInvestor, setSelectedInvestor] = useState('');
  const [investorSearch, setInvestorSearch] = useState('');
  const [showInvestorDropdown, setShowInvestorDropdown] = useState(false);

  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [wallet, setWallet] = useState(null);

  const [loading, setLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);

  // Fetch investors
  useEffect(() => {
    async function fetchInvestors() {
      setLoading(true);
      try {
        const res = await axios.get(`${API_BASE}/api/investors?limit=1000`);
        setInvestors(res.data.data || res.data);
      } catch (err) {
        console.error('Failed to fetch investors', err);
      } finally {
        setLoading(false);
      }
    }
    fetchInvestors();
  }, []);

  // Fetch wallet when investor changes
  useEffect(() => {
    async function fetchWallet() {
      if (!selectedInvestor) {
        setWallet(null);
        return;
      }
      setLoading(true);
      try {
        const investor = investors.find(i => (i._id || i.id) === selectedInvestor);
        if (investor?.phone) {
          const res = await axios.get(`${API_BASE}/api/investor-wallet/${investor.phone}`);
          setWallet(res.data);
        }
      } catch {
        setWallet(null);
      } finally {
        setLoading(false);
      }
    }
    fetchWallet();
  }, [selectedInvestor, investors]);

  // Submit wallet amount
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedInvestor || !amount) return;

    setSubmitLoading(true);
    try {
      const investor = investors.find(i => (i._id || i.id) === selectedInvestor);
      await axios.post(`${API_BASE}/api/investor-wallet`, {
        phone: investor.phone,
        amount: Number(amount),
        description,
        type: 'credit',
      });

      setAmount('');
      setDescription('');

      const res = await axios.get(`${API_BASE}/api/investor-wallet/${investor.phone}`);
      setWallet(res.data);
    } catch {
      alert('Failed to add amount');
    } finally {
      setSubmitLoading(false);
    }
  };

  const selectedInvestorObj = investors.find(
    i => (i._id || i.id) === selectedInvestor
  );

  return (
    <div className="min-h-screen bg-gray-100 p-6 flex justify-center">
      <div className="w-full max-w-xl bg-white shadow-lg rounded-2xl p-8">

        <h1 className="text-2xl font-bold mb-6">Add Wallet Amount</h1>

        <form className="space-y-5" onSubmit={handleSubmit}>
          
          {/* Select Investor */}
          <div className="relative">
            <label className="block text-sm font-medium mb-1">
              Select Investor
            </label>

            <input
              type="text"
              className="w-full border rounded-lg px-4 py-3"
              placeholder="Search investor..."
              value={
                investorSearch ||
                (selectedInvestorObj
                  ? `${selectedInvestorObj.investorName} (${selectedInvestorObj.phone})`
                  : '')
              }
              onChange={(e) => {
                setInvestorSearch(e.target.value);
                setShowInvestorDropdown(true);
              }}
              onFocus={() => setShowInvestorDropdown(true)}
            />

            {selectedInvestor && (
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                onClick={() => {
                  setSelectedInvestor('');
                  setInvestorSearch('');
                }}
              >
                ✕
              </button>
            )}

            {showInvestorDropdown && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowInvestorDropdown(false)}
                />

                <div className="absolute z-20 w-full mt-1 bg-white border rounded-lg shadow max-h-60 overflow-auto">
                  {investors
                    .filter(inv => {
                      const s = investorSearch.toLowerCase();
                      return (
                        inv.investorName?.toLowerCase().includes(s) ||
                        inv.phone?.includes(s)
                      );
                    })
                    .map(inv => {
                      const id = inv._id || inv.id;
                      return (
                        <div
                          key={id}
                          className="px-4 py-2 cursor-pointer hover:bg-blue-50"
                          onClick={() => {
                            setSelectedInvestor(id);
                            setInvestorSearch('');
                            setShowInvestorDropdown(false);
                          }}
                        >
                          <div className="font-medium">
                            {inv.investorName}
                          </div>
                          <div className="text-xs text-gray-500">
                            {inv.phone}
                          </div>
                        </div>
                      );
                    })}

                  {investors.filter(inv =>
                    inv.investorName
                      ?.toLowerCase()
                      .includes(investorSearch.toLowerCase()) ||
                    inv.phone?.includes(investorSearch)
                  ).length === 0 && (
                    <div className="px-4 py-2 text-gray-400 text-sm">
                      No investors found
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Amount */}
          <div>
            <label className="block font-medium mb-1">Enter Amount</label>
            <input
              type="number"
              className="w-full border rounded-lg px-4 py-3"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              disabled={!selectedInvestor || submitLoading}
            />
          </div>

          {/* Description */}
          <div>
            <label className="block font-medium mb-1">Description</label>
            <textarea
              rows="3"
              className="w-full border rounded-lg px-4 py-3"
              value={description}
              onChange={e => setDescription(e.target.value)}
              disabled={!selectedInvestor || submitLoading}
            />
          </div>

          <button
            type="submit"
            disabled={!selectedInvestor || !amount || submitLoading}
            className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700"
          >
            {submitLoading ? 'Adding...' : 'Add Amount'}
          </button>
        </form>

        {/* Wallet Details */}
        {wallet && (
          <div className="mt-8">
            <h2 className="font-semibold mb-2">Wallet Balance</h2>
            <div className="mb-3 font-bold">₹{wallet.balance}</div>

            <table className="w-full border text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="border px-2 py-1">#</th>
                  <th className="border px-2 py-1">Amount</th>
                  <th className="border px-2 py-1">Type</th>
                  <th className="border px-2 py-1">Description</th>
                  <th className="border px-2 py-1">Date</th>
                </tr>
              </thead>
              <tbody>
                {[...wallet.transactions].reverse().map((txn, i) => (
                  <tr key={i}>
                    <td className="border px-2 py-1">{i + 1}</td>
                    <td className="border px-2 py-1">₹{txn.amount}</td>
                    <td className="border px-2 py-1">{txn.type}</td>
                    <td className="border px-2 py-1">{txn.description || '-'}</td>
                    <td className="border px-2 py-1">
                      {new Date(txn.date).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </div>
    </div>
  );
}
