import axios from 'axios';
import React, { useEffect, useState } from 'react';

export default function AddWalletAmount() {
  const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';

  const [investors, setInvestors] = useState([]);
  const [investorSearch, setInvestorSearch] = useState('');
  const [selectedInvestor, setSelectedInvestor] = useState(null);
  const [showInvestorDropdown, setShowInvestorDropdown] = useState(false);

  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [wallet, setWallet] = useState(null);

  const [loading, setLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);

  // -----------------------------
  // Helper
  // -----------------------------
  const getInvestorLabel = (inv) =>
    inv?.investorName || inv?.phone || '';

  // -----------------------------
  // Search Investors (FILTERS)
  // -----------------------------
  useEffect(() => {
    if (!showInvestorDropdown) return;

    let cancelled = false;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await axios.get(
          `${API_BASE}/api/investors/search?q=${encodeURIComponent(
            investorSearch
          )}&limit=50`
        );

        if (!cancelled) {
          setInvestors(res.data?.data || res.data || []);
        }
      } catch (err) {
        console.error('Investor search failed', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [investorSearch, showInvestorDropdown]);

  // -----------------------------
  // Fetch Wallet
  // -----------------------------
  useEffect(() => {
    async function fetchWallet() {
      if (!selectedInvestor?.phone) {
        setWallet(null);
        return;
      }

      try {
        setLoading(true);
        const res = await axios.get(
          `${API_BASE}/api/investor-wallet/${selectedInvestor.phone}`
        );
        setWallet(res.data);
      } catch {
        setWallet(null);
      } finally {
        setLoading(false);
      }
    }

    fetchWallet();
  }, [selectedInvestor]);

  // -----------------------------
  // Submit Amount
  // -----------------------------
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedInvestor || !amount) return;

    setSubmitLoading(true);
    try {
      await axios.post(`${API_BASE}/api/investor-wallet`, {
        phone: selectedInvestor.phone,
        amount: Number(amount),
        description,
        type: 'credit',
      });

      setAmount('');
      setDescription('');

      const res = await axios.get(
        `${API_BASE}/api/investor-wallet/${selectedInvestor.phone}`
      );
      setWallet(res.data);
    } catch {
      alert('Failed to add amount');
    } finally {
      setSubmitLoading(false);
    }
  };

  // -----------------------------
  // UI
  // -----------------------------
  return (
    <div className="min-h-screen bg-gray-100 p-6 flex justify-center">
      <div className="w-full max-w-xl bg-white shadow-lg rounded-2xl p-8">
        <h1 className="text-2xl font-bold mb-6">Add Wallet Amount</h1>

        <form className="space-y-5" onSubmit={handleSubmit}>
          {/* INVESTOR SEARCH */}
          <div className="relative">
            <label className="block text-sm font-medium mb-1">
              Select Investor
            </label>

            <input
              type="text"
              className="w-full border rounded-lg px-4 py-3"
              placeholder="Search investor..."
              value={investorSearch}
              onChange={(e) => {
                setInvestorSearch(e.target.value);
                setSelectedInvestor(null);
                setShowInvestorDropdown(true);
              }}
              onFocus={() => setShowInvestorDropdown(true)}
            />

            {/* CLEAR */}
            {investorSearch && (
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                onClick={() => {
                  setInvestorSearch('');
                  setSelectedInvestor(null);
                  setWallet(null);
                }}
              >
                ✕
              </button>
            )}

            {/* DROPDOWN */}
            {showInvestorDropdown && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowInvestorDropdown(false)}
                />

                <div className="absolute z-20 w-full mt-1 bg-white border rounded-lg shadow max-h-60 overflow-auto">
                  {loading && (
                    <div className="px-4 py-2 text-sm text-gray-400">
                      Searching...
                    </div>
                  )}

                  {!loading && investors.length === 0 && (
                    <div className="px-4 py-2 text-gray-400 text-sm">
                      No investors found
                    </div>
                  )}

                  {investors.map(inv => (
                    <div
                      key={inv._id || inv.id}
                      className="px-4 py-2 cursor-pointer hover:bg-blue-50"
                      onClick={() => {
                        setSelectedInvestor(inv);
                        setInvestorSearch(getInvestorLabel(inv));
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
                  ))}
                </div>
              </>
            )}
          </div>

          {/* AMOUNT */}
          <div>
            <label className="block font-medium mb-1">Enter Amount</label>
            <input
              type="number"
              className="w-full border rounded-lg px-4 py-3"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={!selectedInvestor || submitLoading}
            />
          </div>

          {/* DESCRIPTION */}
          <div>
            <label className="block font-medium mb-1">Description</label>
            <textarea
              rows="3"
              className="w-full border rounded-lg px-4 py-3"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
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

        {/* WALLET */}
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
                    <td className="border px-2 py-1">
                      {txn.description || '-'}
                    </td>
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
