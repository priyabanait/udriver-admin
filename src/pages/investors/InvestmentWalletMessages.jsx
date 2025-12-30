import React, { useEffect, useState } from 'react';
import axios from 'axios';

export default function InvestmentWalletMessages() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';
  useEffect(() => {
    async function fetchMessages() {
      setLoading(true);
      try {
        const res = await axios.get(`${API_BASE}/api/investor-wallet-message`);
        setMessages(res.data);
      } catch (err) {
        setMessages([]);
      } finally {
        setLoading(false);
      }
    }
    fetchMessages();
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Investment Wallet Messages</h1>
      {loading ? (
        <div className="text-center py-8">Loading messages...</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full border text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-3 py-2 border">#</th>
                <th className="px-3 py-2 border">Phone</th>
                <th className="px-3 py-2 border">Message</th>
                <th className="px-3 py-2 border">Date</th>
              </tr>
            </thead>
            <tbody>
              {messages.map((msg, idx) => (
                <tr key={msg._id || idx} className="border-b">
                  <td className="px-3 py-2 border">{idx + 1}</td>
                  <td className="px-3 py-2 border">{msg.phone}</td>
                  <td className="px-3 py-2 border">{msg.message}</td>
                  <td className="px-3 py-2 border">{new Date(msg.createdAt).toLocaleString()}</td>
                </tr>
              ))}
              {messages.length === 0 && (
                <tr><td colSpan={4} className="text-center py-4">No messages found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
