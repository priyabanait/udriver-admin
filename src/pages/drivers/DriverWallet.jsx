import axios from 'axios';
import React, { useEffect, useState } from 'react';

export default function AddWalletAmount() {
  const [drivers, setDrivers] = useState([]);
  const [selectedDriver, setSelectedDriver] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [wallet, setWallet] = useState(null);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [adminMessage, setAdminMessage] = useState('');
  const [adminMsgLoading, setAdminMsgLoading] = useState(false);
  const [adminMsgSuccess, setAdminMsgSuccess] = useState('');

const [driverSearch, setDriverSearch] = useState('');
const [showDriverDropdown, setShowDriverDropdown] = useState(false);

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';
  useEffect(() => {
    async function fetchDrivers() {
      setLoading(true);
      try {
        const res = await axios.get(`${API_BASE}/api/drivers?limit=1000`);
        const data = res.data.data || res.data;
        setDrivers(data);
      } catch (err) {
        console.error('Failed to fetch drivers:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchDrivers();
  }, []);

  useEffect(() => {
    async function fetchWallet() {
      if (!selectedDriver) {
        setWallet(null);
        return;
      }
      setLoading(true);
      try {
        const driver = drivers.find(drv => drv._id === selectedDriver);
        if (driver) {
          const res = await axios.get(`${API_BASE}/api/driver-wallet/${driver.phone}`);
          setWallet(res.data);
        }
      } catch (err) {
        setWallet(null);
      } finally {
        setLoading(false);
      }
    }
    fetchWallet();
  }, [selectedDriver, drivers]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedDriver || !amount) return;
    setSubmitLoading(true);
    try {
      const driver = drivers.find(drv => drv._id === selectedDriver);
      await axios.post(`${API_BASE}/api/driver-wallet`, {
        phone: driver.phone,
        amount: Number(amount),
        description,
        type: 'credit',
      });
      setAmount('');
      setDescription('');
      // Refresh wallet data
      const res = await axios.get(`${API_BASE}/api/driver-wallet/${driver.phone}`);
      setWallet(res.data);
    } catch (err) {
      alert('Failed to add amount');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleAdminMessageSubmit = async (e) => {
    e.preventDefault();
    if (!selectedDriver || !adminMessage) return;
    setAdminMsgLoading(true);
    setAdminMsgSuccess('');
    try {
      const driver = drivers.find(drv => drv._id === selectedDriver);
      await axios.post(`${API_BASE}/api/driver-wallet-message`, {
        phone: driver.phone,
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

  return (
    <div className="min-h-screen bg-gray-100 p-6 flex justify-center items-start">
      <div className="w-full max-w-xl bg-white shadow-lg rounded-2xl p-8 border border-gray-200">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Add Wallet Amount</h1>
        <form className="space-y-5" onSubmit={handleSubmit}>
          <div className="relative">
  <label className="block font-medium text-gray-700 mb-1">
    Select Driver
  </label>

  {/* Input */}
  <input
    type="text"
    className="w-full border border-gray-300 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
    placeholder="Search driver..."
    value={
      driverSearch ||
      (selectedDriver
        ? drivers.find(d => d._id === selectedDriver)?.name ||
          drivers.find(d => d._id === selectedDriver)?.username ||
          drivers.find(d => d._id === selectedDriver)?.phone ||
          ''
        : '')
    }
    onChange={(e) => {
      setDriverSearch(e.target.value);
      setShowDriverDropdown(true);
    }}
    onFocus={() => setShowDriverDropdown(true)}
    disabled={loading}
  />

  {/* Clear button */}
  {selectedDriver && (
    <button
      type="button"
      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
      onClick={() => {
        setSelectedDriver('');
        setDriverSearch('');
      }}
    >
      ✕
    </button>
  )}

  {showDriverDropdown && (
    <>
      {/* Click outside */}
      <div
        className="fixed inset-0 z-10"
        onClick={() => setShowDriverDropdown(false)}
      />

      {/* Dropdown */}
      <div className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-auto">

        {/* Reset */}
        <div
          className="px-3 py-2 text-sm text-gray-500 cursor-pointer hover:bg-gray-100"
          onClick={() => {
            setSelectedDriver('');
            setDriverSearch('');
            setShowDriverDropdown(false);
          }}
        >
          Select Driver
        </div>

        {/* List */}
        {drivers
          .filter(drv => {
            const s = driverSearch.toLowerCase();
            return (
              drv.name?.toLowerCase().includes(s) ||
              drv.username?.toLowerCase().includes(s) ||
              drv.phone?.includes(s)
            );
          })
          .map(drv => (
            <div
              key={drv._id}
              className={`px-3 py-2 cursor-pointer text-sm hover:bg-blue-50 ${
                selectedDriver === drv._id ? 'bg-blue-100' : ''
              }`}
              onClick={() => {
                setSelectedDriver(drv._id);
                setDriverSearch('');
                setShowDriverDropdown(false);
              }}
            >
              <div className="font-medium">
                {drv.name || drv.username}
              </div>
              {drv.phone && (
                <div className="text-xs text-gray-500">
                  {drv.phone}
                </div>
              )}
            </div>
          ))}

        {/* Empty */}
        {drivers.filter(drv =>
          drv.name?.toLowerCase().includes(driverSearch.toLowerCase()) ||
          drv.username?.toLowerCase().includes(driverSearch.toLowerCase()) ||
          drv.phone?.includes(driverSearch)
        ).length === 0 && (
          <div className="px-3 py-2 text-sm text-gray-400">
            No drivers found
          </div>
        )}
      </div>
    </>
  )}
</div>

          <div>
            <label className="block font-medium text-gray-700 mb-1">Enter Amount</label>
            <input
              type="number"
              placeholder="Enter wallet amount"
              className="w-full border border-gray-300 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              disabled={!selectedDriver || submitLoading}
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
              disabled={!selectedDriver || submitLoading}
            ></textarea>
          </div>
          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg shadow-md transition-all"
            disabled={submitLoading || !selectedDriver || !amount}
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
