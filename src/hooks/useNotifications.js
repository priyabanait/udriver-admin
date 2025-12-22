import { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import { useAuth } from '../contexts/AuthContext';

const API_BASE = import.meta.env.VITE_API_BASE || 'https://udrive-backend-1igb.vercel.app';

export default function useNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const socketRef = useRef(null);

  const { user: auth } = useAuth();

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const headers = (auth?.token) ? { Authorization: `Bearer ${auth.token}` } : {};
        const res = await axios.get(`${API_BASE}/api/notifications?limit=20&page=1`, { headers });
        if (!mounted) return;
        // API returns { items, pagination }
        const arr = Array.isArray(res.data) ? res.data : (res.data.items || []);
        setNotifications(arr);
        setUnreadCount((arr || []).filter(n => !n.read).length);
      } catch (err) {
        console.warn('Failed to load notifications', err.message);
      }
    }

    load();

    const socketUrl = import.meta.env.VITE_API_BASE || 'https://udrive-backend-1igb.vercel.app';
    socketRef.current = io(socketUrl, { transports: ['websocket'] });

    socketRef.current.on('connect', () => {
      // console.log('Notifications socket connected', socketRef.current.id);
    });

    socketRef.current.on('dashboard:notification', (payload) => {
      setNotifications(prev => [payload, ...prev]);
      setUnreadCount(c => c + 1);
    });

    return () => {
      mounted = false;
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  async function markAsRead(id) {
    try {
      await axios.post(`${API_BASE}/api/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.warn('Failed to mark as read', err.message);
    }
  }

  return { notifications, unreadCount, markAsRead };
}
