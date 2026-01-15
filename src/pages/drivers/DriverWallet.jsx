import axios from 'axios';
import React, { useEffect, useState } from 'react';

export default function AddWalletAmount() {
  const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';

  const [drivers, setDrivers] = useState([]);
  const [driverSearch, setDriverSearch] = useState('');
  const [selectedDriverId, setSelectedDriverId] = useState('');
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [showDriverDropdown, setShowDriverDropdown] = useState(false);

  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [wallet, setWallet] = useState(null);

  const [loading, setLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);

  // -------------------------------
  // Helper
  // -------------------------------
  const getDriverLabel = (drv) =>
    drv?.name || drv?.username || drv?.phone || '';

  // -------------------------------
  // Search Drivers (debounced)
  // -------------------------------
  useEffect(() => {
    if (!showDriverDropdown) return;

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await axios.get(
          `${API_BASE}/api/drivers/search?q=${encodeURIComponent(
            driverSearch
          )}&limit=50`,
          { signal: controller.signal }
        );

        const list = res.data?.data || res.data || [];
        setDrivers(list.map(d => ({ ...d, id: d._id || d.id })));
      } catch (err) {
        if (err.name !== 'CanceledError') {
          console.error('Driver search failed:', err);
        }
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [driverSearch, showDriverDropdown]);

  // -------------------------------
  // Fetch Wallet
  // -------------------------------
  useEffect(() => {
    async function fetchWallet() {
      if (!selectedDriver?.phone) {
        setWallet(null);
        return;
      }

      try {
        setLoading(true);
        const res = await axios.get(
          `${API_BASE}/api/driver-wallet/${selectedDriver.phone}`
        );
        setWallet(res.data);
      } catch (err) {
        console.error('Wallet fetch failed:', err);
        setWallet(null);
      } finally {
        setLoading(false);
      }
    }

    fetchWallet();
  }, [selectedDriver]);

  // -------------------------------
  // Add Wallet Amount
  // -------------------------------
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedDriver || !amount) return;

    setSubmitLoading(true);
    try {
      await axios.post(`${API_BASE}/api/driver-wallet`, {
        phone: selectedDriver.phone,
        amount: Number(amount),
        description,
        type: 'credit',
      });

      setAmount('');
      setDescription('');

      const res = await axios.get(
        `${API_BASE}/api/driver-wallet/${selectedDriver.phone}`
      );
      setWallet(res.data);
    } catch (err) {
      alert('Failed to add wallet amount');
    } finally {
      setSubmitLoading(false);
    }
  };

  // -------------------------------
  // UI
  // -------------------------------
  return (
    <div className="min-h-screen bg-gray-100 p-6 flex justify-center">
      <div className="w-full max-w-xl bg-white shadow-lg rounded-2xl p-8 border border-gray-200">
        <h1 className="text-2xl font-bold mb-6 text-gray-800">
          Add Wallet Amount
        </h1>

        <form className="space-y-5" onSubmit={handleSubmit}>
          {/* DRIVER SEARCH */}
          <div className="relative">
            <label className="block font-medium text-gray-700 mb-1">
              Select Driver
            </label>

            <input
              type="text"
              className="w-full border border-gray-300 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Search driver..."
              value={driverSearch}
              onChange={(e) => {
                setDriverSearch(e.target.value);
                setSelectedDriverId('');
                setSelectedDriver(null);
                setShowDriverDropdown(true);
              }}
              onFocus={() => setShowDriverDropdown(true)}
            />

            {/* CLEAR */}
            {driverSearch && (
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                onClick={() => {
                  setDriverSearch('');
                  setSelectedDriverId('');
                  setSelectedDriver(null);
                  setWallet(null);
                }}
              >
                ✕
              </button>
            )}

            {/* DROPDOWN */}
            {showDriverDropdown && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowDriverDropdown(false)}
                />

                <div className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-auto">
                  {loading && (
                    <div className="px-3 py-2 text-sm text-gray-400">
                      Searching...
                    </div>
                  )}

                  {!loading && drivers.length === 0 && (
                    <div className="px-3 py-2 text-sm text-gray-400">
                      No drivers found
                    </div>
                  )}

                  {drivers.map((drv) => (
                    <div
                      key={drv.id}
                      className={`px-3 py-2 cursor-pointer text-sm hover:bg-blue-50 ${
                        selectedDriverId === drv.id ? 'bg-blue-100' : ''
                      }`}
                      onClick={() => {
                        setSelectedDriverId(drv.id);
                        setSelectedDriver(drv);
                        setDriverSearch(getDriverLabel(drv));
                        setShowDriverDropdown(false);
                      }}
                    >
                      <div className="font-medium">
                        {getDriverLabel(drv)}
                      </div>
                      {drv.phone && (
                        <div className="text-xs text-gray-500">
                          {drv.phone}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* AMOUNT */}
          <div>
            <label className="block font-medium text-gray-700 mb-1">
              Enter Amount
            </label>
            <input
              type="number"
              className="w-full border border-gray-300 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={!selectedDriver || submitLoading}
            />
          </div>

          {/* DESCRIPTION */}
          <div>
            <label className="block font-medium text-gray-700 mb-1">
              Description (optional)
            </label>
            <textarea
              rows="3"
              className="w-full border border-gray-300 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={!selectedDriver}
            />
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg shadow-md transition-all"
            disabled={!selectedDriver || !amount || submitLoading}
          >
            {submitLoading ? 'Adding...' : 'Add Amount'}
          </button>
        </form>

        {/* WALLET DETAILS */}
        {wallet && (
          <div className="mt-8">
            <h2 className="text-lg font-semibold mb-2">Wallet Details</h2>
            <div className="mb-2">
              Balance:{' '}
              <span className="font-bold text-green-600">
                ₹{wallet.balance}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full border text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="border px-3 py-2">#</th>
                    <th className="border px-3 py-2">Amount</th>
                    <th className="border px-3 py-2">Type</th>
                    <th className="border px-3 py-2">Description</th>
                    <th className="border px-3 py-2">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {wallet.transactions
                    .slice()
                    .reverse()
                    .map((txn, idx) => (
                      <tr key={idx}>
                        <td className="border px-3 py-2">{idx + 1}</td>
                        <td className="border px-3 py-2">
                          ₹{txn.amount}
                        </td>
                        <td className="border px-3 py-2">
                          {txn.type}
                        </td>
                        <td className="border px-3 py-2">
                          {txn.description || '-'}
                        </td>
                        <td className="border px-3 py-2">
                          {new Date(txn.date).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
